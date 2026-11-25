import { h } from './dom.js';

const when = (ts) => (ts ? new Date(ts).toLocaleString('uk-UA', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '');
const PAGES = { judge: 'сторінка судді', head: 'Head Judge', admin: 'організатор', index: 'головна' };

// The organizer's view: who is here, who practised, what they wrote.
export function activityView(rows, feedback) {
  const visited = rows.filter(r => r.last_seen).length;
  const online = rows.filter(r => r.online).length;
  const names = new Map(rows.map(r => [r.email, r.full_name || r.email]));
  const state = (r) => (r.online
    ? h('strong', { class: 'online' }, '● зараз на платформі')
    : r.last_seen ? `був(ла) ${when(r.last_seen)}` : h('span', { class: 'muted' }, 'ще не заходила'));
  return [
    h('p', { class: 'card' }, `Заходили: ${visited} з ${rows.length} · зараз на платформі: ${online}`),
    h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Імʼя'), h('th', {}, 'Активність'), h('th', { class: 'num' }, 'Заходів'),
        h('th', { class: 'num' }, 'Місць'), h('th', { class: 'num' }, 'Надіслано'), h('th', { class: 'num' }, 'Чернеток'))),
      h('tbody', {}, rows.map(r => h('tr', {},
        h('td', {}, r.full_name || '—', h('div', { class: 'muted' }, r.email)),
        h('td', {}, state(r)),
        h('td', { class: 'num' }, r.visits), h('td', { class: 'num' }, r.seats),
        h('td', { class: 'num' }, r.submitted), h('td', { class: 'num' }, r.drafts)))))),
    h('h2', {}, `Відгуки (${feedback.length})`),
    feedback.length
      ? h('ul', { class: 'perf-list' }, feedback.map(f => h('li', { class: 'card' },
        h('strong', {}, names.get(f.email) ?? f.email),
        h('span', { class: 'muted' }, ` · ${when(f.at)} · ${PAGES[f.page] ?? f.page}`),
        h('p', { class: 'feedback-text' }, f.message))))
      : h('p', { class: 'muted' }, 'Поки що відгуків немає.'),
  ];
}
