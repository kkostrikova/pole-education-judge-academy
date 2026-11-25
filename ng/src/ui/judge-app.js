import { supabase } from '../data/client.js';
import { makeApi } from '../data/api.js';
import { requireSession, signOut, ensureSessionForSync, ensureName, showNameEditor, showNav } from './session.js';
import { groupedList } from './grouped-list.js';
import { showFeedbackButton, startPresence } from './feedback.js';
import { h, mount, toast, retryCard } from './dom.js';
import { uaError } from './errors.js';
import { getProtocol, protocolKeyFor, PANEL_LABELS, APPARATUS_LABELS } from '../protocols/index.js';
import { createSaveQueue } from '../sync/offline-queue.js';
import { sheetEditor, sheetKey } from './sheet-editor.js';

const api = makeApi(supabase);
const app = document.getElementById('app');
const syncEl = document.getElementById('sync');

const STATUS = {
  empty: 'Не оцінено', draft: 'Чернетка', queued: 'Очікує мережі', submitted: 'Надіслано',
  reopened: 'Повернено на виправлення', confirmed: 'Підтверджено', dsq: 'DSQ',
};
const isLocked = (s) => s === 'queued' || s === 'submitted' || s === 'confirmed' || s === 'dsq';

const st = { seats: [], seat: null, perfs: [], sheets: new Map(), view: 'seats', current: null, currentLocked: false };

let queue = null; // created after sign-in: the storage key is per user

function setSync(text, kind) { syncEl.textContent = text; syncEl.dataset.kind = kind; }

function onSync(id, status, payload) {
  if (status === 'pending') setSync('Збережено на пристрої', 'pending');
  if (status === 'saved' || status === 'submitted') {
    setSync(status === 'submitted' ? 'Надіслано' : 'Збережено', 'ok');
    if (payload?.performance_id) st.sheets.set(payload.performance_id, payload);
    if (st.view === 'list') showList();
  }
  if (status === 'offline') setSync('Немає мережі — надішлемо автоматично', 'offline');
  if (status === 'rejected') {
    setSync('Не збережено', 'offline');
    toast(uaError(payload));
    refresh();
  }
}

function statusOf(perf) {
  if (perf.status === 'dsq') return 'dsq';
  if (perf.status !== 'pending') return 'confirmed';
  const q = queue.pending(sheetKey(perf.id, st.seat.id));
  const s = st.sheets.get(perf.id);
  if (q?.submit) return 'queued';
  if (s?.status === 'submitted') return 'submitted';
  if (s?.status === 'reopened') return 'reopened';
  return q || s ? 'draft' : 'empty';
}

function showSeats() {
  st.view = 'seats';
  mount(app,
    h('h1', {}, 'Мої категорії'),
    st.seats.length
      ? groupedList({
        items: st.seats, categoryOf: seat => seat.categories, storageKey: 'ng-judge-group',
        renderItem: seat => {
          const c = seat.categories;
          return h('button', { class: 'perf', onclick: () => openSeat(seat) },
            h('span', { class: 'name' }, c.name,
              h('small', {}, `${c.tournaments.name} · ${APPARATUS_LABELS[c.apparatus]} · ${[c.age_group, c.level].filter(Boolean).join(' · ')}`)),
            h('span', { class: 'badge' }, `${PANEL_LABELS[seat.panel]} · №${seat.seat_no}`));
        },
      })
      : h('p', { class: 'card' }, 'Вас ще не призначено в жодну панель. Зверніться до організатора.'));
}

async function loadSeat() {
  const c = st.seat.categories;
  const [perfs, sheets] = await Promise.all([api.performances(c.id), api.sheetsForSeat(st.seat.id)]);
  st.perfs = perfs;
  st.sheets = new Map(sheets.map(s => [s.performance_id, s]));
}

async function openSeat(seat) {
  st.seat = seat;
  try { await loadSeat(); } catch { mount(app, retryCard(() => openSeat(seat))); return; }
  showList();
}

function showList() {
  st.view = 'list';
  st.current = null;
  const c = st.seat.categories;
  const done = st.perfs.filter(p => isLocked(statusOf(p))).length;
  mount(app,
    st.seats.length > 1 ? h('button', { class: 'link', onclick: showSeats }, '← Мої категорії') : null,
    h('h1', {}, c.name),
    h('p', { class: 'muted' }, `${PANEL_LABELS[st.seat.panel]} · суддя №${st.seat.seat_no} · оцінено ${done} з ${st.perfs.length}`),
    h('ol', { class: 'perf-list' }, st.perfs.map(p => {
      const s = statusOf(p);
      return h('li', {}, h('button', { class: `perf status-${s}`, onclick: () => openPerf(p) },
        h('span', { class: 'no' }, p.start_no),
        h('span', { class: 'name' }, p.athlete_name, p.members ? h('small', {}, p.members) : null),
        h('span', { class: 'badge' }, STATUS[s])));
    })));
}

function openPerf(perf) {
  st.view = 'sheet';
  st.current = perf;
  const c = st.seat.categories;
  const s = statusOf(perf);
  st.currentLocked = isLocked(s);
  const protocol = getProtocol(protocolKeyFor(st.seat.panel, c.apparatus));
  const data = queue.pending(sheetKey(perf.id, st.seat.id))?.data ?? st.sheets.get(perf.id)?.data ?? {};
  const idx = st.perfs.findIndex(p => p.id === perf.id);
  const goNext = () => {
    const nextOpen = st.perfs.slice(idx + 1).find(p => !isLocked(statusOf(p)));
    nextOpen ? openPerf(nextOpen) : showList();
  };
  mount(app,
    h('div', { class: 'tabs no-print' },
      h('button', { onclick: showList }, '← Список'),
      idx > 0 ? h('button', { onclick: () => openPerf(st.perfs[idx - 1]) }, '‹ Попередній') : null,
      idx < st.perfs.length - 1 ? h('button', { onclick: () => openPerf(st.perfs[idx + 1]) }, 'Наступний ›') : null),
    h('h1', {}, `№${perf.start_no} · ${perf.athlete_name}`),
    h('p', { class: 'muted' }, [perf.members, perf.club, STATUS[s]].filter(Boolean).join(' · ')),
    s === 'reopened' ? h('p', { class: 'errors' }, 'Head Judge повернув протокол на виправлення.') : null,
    sheetEditor({
      protocol, ctx: { apparatus: c.apparatus }, perf, seatId: st.seat.id,
      queue, data, locked: st.currentLocked, onSubmitted: goNext,
    }));
  window.scrollTo(0, 0);
}

async function refresh() {
  if (!st.seat) return;
  try { await loadSeat(); } catch { return; }
  if (st.view === 'list') showList();
  if (st.view === 'sheet' && st.current) {
    const fresh = st.perfs.find(p => p.id === st.current.id);
    if (fresh && isLocked(statusOf(fresh)) !== st.currentLocked) openPerf(fresh);
  }
}

(async () => {
  const email = await requireSession(supabase);
  await ensureName(api, email, app);
  showNameEditor(api, email);
  showNav(api, email, 'judge');
  showFeedbackButton(api, 'judge');
  startPresence(api);
  queue = createSaveQueue({
    storage: localStorage,
    key: `ng-save-queue:${email}`,
    send: async (it) => {
      await ensureSessionForSync(supabase, 'judge.html');
      return api.saveSheet(it.performanceId, it.seatId, it.data, it.submit);
    },
    onStatus: onSync,
  });
  document.getElementById('signout').onclick = () => signOut(supabase, queue);
  const syncNow = () => { queue.flush(); refresh(); };
  window.addEventListener('online', syncNow);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(); });
  setInterval(syncNow, 15000);
  queue.flush();
  api.subscribe(['score_sheets', 'performances'], () => refresh());
  const start = async () => {
    try {
      st.seats = (await api.mySeats(email)).filter(s => s.panel !== 'head');
    } catch { mount(app, retryCard(start)); return; }
    if (st.seats.length === 1) await openSeat(st.seats[0]);
    else showSeats();
  };
  await start();
})();
