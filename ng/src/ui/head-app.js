import { supabase } from '../data/client.js';
import { makeApi } from '../data/api.js';
import { requireSession, signOut, ensureSessionForSync } from './session.js';
import { h, mount, fmt, toast, retryCard } from './dom.js';
import { uaError } from './errors.js';
import { getProtocol, protocolKeyFor, PANELS_BY_KIND, PANEL_LABELS, APPARATUS_LABELS, seatHasProtocol } from '../protocols/index.js';
import { protocolMax } from '../scoring/sheet.js';
import { performanceResult, isDivergent } from '../scoring/aggregate.js';
import { createSaveQueue } from '../sync/offline-queue.js';
import { sheetEditor, sheetKey } from './sheet-editor.js';
import { sheetTable } from './sheet-table.js';
import { rankingTable } from './ranking-table.js';

const api = makeApi(supabase);
const app = document.getElementById('app');
const syncEl = document.getElementById('sync');

const SHORT = { technical: 'Т', mandatory: 'О', artistry: 'А', deductions: 'З', art: 'Арт', head: 'HJ' };
const st = {
  email: null, categories: [], cat: null, perfs: [], seats: [], sheets: [], results: [],
  names: new Map(), view: 'cats', perf: null, open: new Set(),
};

let queue = null; // created after sign-in: the storage key is per user
const makeQueue = (email) => createSaveQueue({
  storage: localStorage,
  key: `ng-head-queue:${email}`,
  send: async (it) => {
    await ensureSessionForSync(supabase, 'head.html');
    return api.saveSheet(it.performanceId, it.seatId, it.data, it.submit);
  },
  onStatus: (id, status, payload) => {
    const map = { pending: ['Збережено на пристрої', 'pending'], saved: ['Збережено', 'ok'], submitted: ['Надіслано', 'ok'], offline: ['Немає мережі', 'offline'] };
    if (map[status]) { syncEl.textContent = map[status][0]; syncEl.dataset.kind = map[status][1]; }
    if (status === 'rejected') {
      syncEl.textContent = 'Не збережено';
      syncEl.dataset.kind = 'offline';
      toast(uaError(payload));
    }
    if (status === 'submitted' || status === 'rejected') reload({ force: true });
  },
});

const needsSheet = (seat) => seatHasProtocol(st.cat.kind, seat.panel);
const sheetOf = (perfId, seatId) => st.sheets.find(s => s.performance_id === perfId && s.seat_id === seatId);
const ctx = () => ({ apparatus: st.cat.apparatus });
const seatName = (seat) => st.names.get(seat.email) || seat.email;
const mySeat = () => st.seats.find(s => s.panel === 'head' && s.email === st.email);

function allSubmitted(perf) {
  return st.seats.filter(needsSheet).every(seat => sheetOf(perf.id, seat.id)?.status === 'submitted');
}

let reloadTimer = null;
function scheduleReload() {
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => { reloadTimer = null; reload(); }, 600);
}

let deferred = null; // { editor, handler }: pending re-render until the editor loses focus
function clearDeferred() {
  if (!deferred) return;
  deferred.editor.removeEventListener('focusout', deferred.handler);
  deferred = null;
}

function editorHasFocus() {
  return st.view === 'perf' && Boolean(app.querySelector('.sheet-editor')?.contains(document.activeElement));
}

function deferRenderUntilBlur() {
  const editor = app.querySelector('.sheet-editor');
  if (!editor || deferred?.editor === editor) return;
  clearDeferred();
  const handler = () => {
    deferred = null;
    setTimeout(() => {
      if (editorHasFocus()) { deferRenderUntilBlur(); return; }
      if (st.view === 'perf' && st.perf) showPerf(st.perfs.find(p => p.id === st.perf.id) ?? st.perf, { keepScroll: true });
    }, 0);
  };
  deferred = { editor, handler };
  editor.addEventListener('focusout', handler, { once: true });
}

// force: true is for the head's own actions (her submit, a queued save landing); it always re-renders.
// Realtime events go through scheduleReload, which respects the focus guard.
// Returns false when loading failed; the current view is kept and a toast explains.
async function reload({ force = false } = {}) {
  if (!st.cat) return true;
  const id = st.cat.id;
  let data;
  try {
    data = await Promise.all([
      api.performances(id), api.seats(id), api.categorySheets(id), api.results(id), api.people(),
    ]);
  } catch (e) { toast(uaError(e)); return false; }
  const [perfs, seats, sheets, results, people] = data;
  Object.assign(st, { perfs, seats, sheets, results });
  st.names = new Map(people.map(p => [p.email, p.full_name]));
  if (st.view === 'board') showBoard();
  if (st.view === 'ranking') showRanking();
  if (st.view === 'perf' && st.perf) {
    if (!force && editorHasFocus()) { deferRenderUntilBlur(); return true; }
    clearDeferred();
    showPerf(st.perfs.find(p => p.id === st.perf.id) ?? st.perf, { keepScroll: true });
  }
  return true;
}

function showCategories() {
  st.view = 'cats';
  mount(app, h('h1', {}, 'Категорії'),
    st.categories.length
      ? h('ul', { class: 'perf-list' }, st.categories.map(c => h('li', {}, h('button', { class: 'perf', onclick: () => openCategory(c) },
        h('span', { class: 'name' }, c.name, h('small', {}, `${c.tournaments?.name ?? ''} · ${APPARATUS_LABELS[c.apparatus]}`))))))
      : h('p', { class: 'card' }, 'Ви не призначені Head Judge жодної категорії.'));
}

async function openCategory(c) {
  st.cat = c;
  st.view = 'board';
  if (!(await reload())) { st.cat = null; showCategories(); }
}

function header(active) {
  return [
    st.categories.length > 1 ? h('button', { class: 'link', onclick: showCategories }, '← Категорії') : null,
    h('h1', {}, st.cat.name),
    h('div', { class: 'tabs' },
      h('button', { 'aria-selected': String(active === 'board'), onclick: () => { st.view = 'board'; showBoard(); } }, 'Виступи'),
      h('button', { 'aria-selected': String(active === 'ranking'), onclick: () => { st.view = 'ranking'; showRanking(); } }, 'Рейтинг'),
      h('a', { class: 'button', href: `print.html?category=${st.cat.id}`, target: '_blank' }, 'Друк / PDF')),
  ];
}

function cellFor(perf, seat) {
  if (!needsSheet(seat)) return h('td', { class: 'cell-empty' }, '—');
  const s = sheetOf(perf.id, seat.id);
  const kind = s?.status ?? 'empty';
  const label = { submitted: '✓', draft: '✎', reopened: '↺', empty: '·' }[kind];
  return h('td', { class: `num cell-${kind}`, title: s ? `${fmt(Number(s.total))}` : 'Немає протоколу' }, label);
}

function showBoard() {
  const seats = st.seats.filter(needsSheet);
  mount(app, header('board'),
    h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, '№'), h('th', {}, 'Учасниця'),
        seats.map(s => h('th', { class: 'num', title: `${PANEL_LABELS[s.panel]} · ${seatName(s)}` }, `${SHORT[s.panel]}${s.seat_no}`)),
        h('th', {}, 'Статус'))),
      h('tbody', {}, st.perfs.map(p => h('tr', { class: 'clickable', onclick: () => showPerf(p) },
        h('td', {}, p.start_no), h('td', {}, p.athlete_name),
        seats.map(s => cellFor(p, s)),
        h('td', {}, p.status === 'confirmed' ? 'Підтверджено' : p.status === 'dsq' ? 'DSQ'
          : allSubmitted(p) ? h('strong', {}, 'Готово до підтвердження') : 'Очікує')))))),
    h('p', { class: 'muted' }, '✓ надіслано · ✎ чернетка · ↺ повернено судді · · немає протоколу'));
}

function panelBlock(perf, panel) {
  const seats = st.seats.filter(s => s.panel === panel && needsSheet(s));
  if (!seats.length) return null;
  const protocol = getProtocol(protocolKeyFor(panel, st.cat.apparatus));
  const submitted = seats.map(s => sheetOf(perf.id, s.id)).filter(s => s?.status === 'submitted');
  const totals = submitted.map(s => Number(s.total));
  const scored = panel !== 'deductions' && panel !== 'head';
  const divergent = scored && isDivergent(totals, protocolMax(protocol, ctx()));
  return h('section', { class: `card${divergent ? ' divergent' : ''}` },
    h('h3', {}, PANEL_LABELS[panel], divergent ? h('span', { class: 'badge', style: 'background:var(--bad);color:#fff;margin-left:8px' }, 'Велика розбіжність') : null),
    seats.map(seat => {
      const s = sheetOf(perf.id, seat.id);
      const key = `${perf.id}:${seat.id}`;
      return h('div', { class: 'proto-row' },
        h('div', { class: 'counter' },
          h('strong', {}, `${SHORT[panel]}${seat.seat_no} · ${seatName(seat)}`),
          h('span', { class: 'badge' }, s?.status === 'submitted' ? `Надіслано · ${fmt(Number(s.total))}` : s?.status === 'reopened' ? 'Повернено' : s ? 'Чернетка' : 'Немає'),
          s ? h('button', { class: 'link', onclick: () => { st.open.has(key) ? st.open.delete(key) : st.open.add(key); showPerf(perf, { keepScroll: true }); } },
            st.open.has(key) ? 'Сховати протокол' : 'Показати протокол') : null,
          s?.status === 'submitted' && perf.status === 'pending' && (seat.panel !== 'head' || seat.id === mySeat()?.id)
            ? h('button', { class: 'danger', onclick: () => reopen(s, seat) }, 'Повернути на виправлення') : null),
        st.open.has(key) && s ? sheetTable(protocol, s.data, ctx()) : null);
    }));
}

async function reopen(sheet, seat) {
  if (!confirm(`Повернути протокол судді ${seatName(seat)} на виправлення?`)) return;
  try { await api.reopenSheet(sheet.id); await reload(); } catch (e) { toast(uaError(e)); }
}

function resultBlock(perf) {
  const stored = st.results.find(r => r.performance_id === perf.id);
  if (perf.status !== 'pending' && stored) {
    return h('section', { class: 'card' },
      h('h3', {}, perf.status === 'dsq' ? 'Результат: DSQ' : `Результат: ${fmt(Number(stored.final))}`),
      st.cat.kind === 'sport'
        ? h('p', {}, `Техніка ${fmt(Number(stored.technical))} · Обовʼязкові ${fmt(Number(stored.mandatory))} · Артистизм ${fmt(Number(stored.artistry))} · Збавки ${fmt(Number(stored.deductions))} · Штрафи HJ ${fmt(Number(stored.head_penalties))}`)
        : null,
      h('button', { class: 'danger', onclick: () => unconfirm(perf) }, 'Зняти підтвердження'));
  }
  const sheets = st.sheets
    .filter(s => s.performance_id === perf.id && s.status === 'submitted')
    .map(s => ({ panel: st.seats.find(x => x.id === s.seat_id)?.panel, total: Number(s.total), dsq: s.dsq, data: s.data }));
  const preview = performanceResult(st.cat.kind, sheets);
  const ready = allSubmitted(perf);
  return h('section', { class: 'card' },
    h('h3', {}, `Попередній підсумок: ${preview.dsq ? 'DSQ' : fmt(preview.final)}`),
    ready ? null : h('p', { class: 'muted' }, 'Підтвердити можна, коли всі протоколи надіслані.'),
    h('button', { class: 'primary big', disabled: !ready, onclick: () => confirmPerf(perf) }, 'Підтвердити результат'));
}

async function confirmPerf(perf) {
  if (!confirm(`Підтвердити результат №${perf.start_no} ${perf.athlete_name}?`)) return;
  try { await api.confirm(perf.id); await reload(); } catch (e) { toast(uaError(e)); }
}

async function unconfirm(perf) {
  if (!confirm('Зняти підтвердження? Судді знову зможуть змінювати протоколи після повернення.')) return;
  try { await api.unconfirm(perf.id); await reload(); } catch (e) { toast(uaError(e)); }
}

function showPerf(perf, { keepScroll = false } = {}) {
  st.view = 'perf';
  st.perf = perf;
  const y = window.scrollY;
  const me = mySeat();
  const headSheet = me ? sheetOf(perf.id, me.id) : null;
  const queued = me ? queue.pending(sheetKey(perf.id, me.id)) : null;
  const headLocked = perf.status !== 'pending' || headSheet?.status === 'submitted' || Boolean(queued?.submit);
  mount(app, header('board'),
    h('h2', {}, `№${perf.start_no} · ${perf.athlete_name}`),
    h('p', { class: 'muted' }, [perf.members, perf.club, perf.coach].filter(Boolean).join(' · ')),
    PANELS_BY_KIND[st.cat.kind].map(panel => panelBlock(perf, panel)),
    st.cat.kind === 'sport' && me
      ? h('section', { class: 'card' }, h('h3', {}, 'Мої штрафи (Head Judge)'),
        sheetEditor({
          protocol: getProtocol('head'), ctx: ctx(), perf, seatId: me.id, queue,
          data: queued?.data ?? headSheet?.data ?? {}, locked: headLocked, onSubmitted: () => reload({ force: true }),
        }))
      : null,
    resultBlock(perf));
  if (keepScroll) window.scrollTo(0, y);
}

function showRanking() {
  mount(app, header('ranking'), rankingTable(st.cat.kind, st.perfs, st.results));
}

(async () => {
  st.email = await requireSession(supabase);
  queue = makeQueue(st.email);
  document.getElementById('signout').onclick = () => signOut(supabase, queue);
  window.addEventListener('online', () => { queue.flush(); reload(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reload(); });
  queue.flush();
  api.subscribe(['score_sheets', 'performances', 'performance_results'], () => scheduleReload());
  const start = async () => {
    try {
      const [person, seats] = await Promise.all([api.person(st.email), api.mySeats(st.email)]);
      st.categories = person?.is_admin
        ? await api.allCategories()
        : seats.filter(s => s.panel === 'head').map(s => s.categories);
    } catch { mount(app, retryCard(start)); return; }
    const wanted = new URLSearchParams(location.search).get('category');
    const initial = st.categories.find(c => c.id === wanted) ?? (st.categories.length === 1 ? st.categories[0] : null);
    if (initial) await openCategory(initial);
    else showCategories();
  };
  await start();
})();
