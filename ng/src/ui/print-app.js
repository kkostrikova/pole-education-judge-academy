import { supabase } from '../data/client.js';
import { makeApi } from '../data/api.js';
import { requireSession } from './session.js';
import { h, mount, fmt } from './dom.js';
import { uaError } from './errors.js';
import { getProtocol, protocolKeyFor, PANELS_BY_KIND, PANEL_LABELS, APPARATUS_LABELS, ENTRY_TYPE_LABELS, seatHasProtocol } from '../protocols/index.js';
import { sheetTable } from './sheet-table.js';
import { rankingTable } from './ranking-table.js';

const api = makeApi(supabase);
const app = document.getElementById('app');

(async () => {
  const email = await requireSession(supabase);
  const id = new URLSearchParams(location.search).get('category');
  if (!id) {
    mount(app, h('p', { class: 'card errors' }, 'Не вказано категорію для друку.'), h('a', { class: 'button', href: 'index.html' }, 'На головну'));
    return;
  }
  try {
    const [me, mine] = await Promise.all([api.person(email), api.mySeats(email)]);
    const allowed = me?.is_admin || mine.some(s => s.category_id === id && s.panel === 'head');
    if (!allowed) {
      mount(app, h('p', { class: 'card errors' }, 'Друк протоколів доступний лише організатору та Head Judge цієї категорії.'),
        h('a', { class: 'button', href: 'index.html' }, 'На головну'));
      return;
    }
    const [cat, perfs, seats, sheets, results, people] = await Promise.all([
      api.category(id), api.performances(id), api.seats(id), api.categorySheets(id), api.results(id), api.people(),
    ]);
    const names = new Map(people.map(p => [p.email, p.full_name || p.email]));
    const ctx = { apparatus: cat.apparatus };
    const order = PANELS_BY_KIND[cat.kind];
    const seatsSorted = seats
      .filter(s => seatHasProtocol(cat.kind, s.panel))
      .sort((a, b) => order.indexOf(a.panel) - order.indexOf(b.panel) || a.seat_no - b.seat_no);
    const when = (ts) => (ts ? new Date(ts).toLocaleString('uk-UA') : '—');

    mount(app,
      h('div', { class: 'no-print tabs' }, h('button', { class: 'primary', onclick: () => window.print() }, 'Друк / Зберегти як PDF')),
      h('h1', {}, `${cat.tournaments.name} · ${cat.name}`),
      h('p', { class: 'muted' }, [APPARATUS_LABELS[cat.apparatus], cat.age_group, cat.level, ENTRY_TYPE_LABELS[cat.entry_type]].filter(Boolean).join(' · ')),
      h('h2', {}, 'Рейтинг'),
      rankingTable(cat.kind, perfs, results),
      perfs.map(p => {
        const r = results.find(x => x.performance_id === p.id);
        return h('section', { class: 'print-performance' },
          h('h2', {}, `№${p.start_no} · ${p.athlete_name}`),
          h('p', {}, [p.members, p.club, p.coach].filter(Boolean).join(' · ')),
          h('p', {}, p.status === 'dsq' ? h('strong', {}, 'DSQ') : r ? h('strong', {}, `Підсумок: ${fmt(Number(r.final))}`) : 'Не підтверджено'),
          seatsSorted.map(seat => {
            const s = sheets.find(x => x.performance_id === p.id && x.seat_id === seat.id);
            return h('div', { class: 'print-block' },
              h('h3', {}, `${PANEL_LABELS[seat.panel]} · суддя №${seat.seat_no} · ${names.get(seat.email)}`),
              s ? sheetTable(getProtocol(protocolKeyFor(seat.panel, cat.apparatus)), s.data, ctx) : h('p', { class: 'muted' }, 'Протокол відсутній'),
              h('p', { class: 'signature' }, `Разом: ${s ? fmt(Number(s.total)) : '—'} · Надіслано: ${when(s?.submitted_at)} · Підпис: ____________________`));
          }));
      }));
  } catch (e) {
    mount(app, h('p', { class: 'card errors' }, 'Не вдалося завантажити дані. Перевірте інтернет і оновіть сторінку.'),
      h('p', { class: 'muted' }, uaError(e)));
  }
})();
