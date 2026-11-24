import { h, fmt, num } from './dom.js';

function cell(item, v) {
  switch (item.type) {
    case 'score': return v == null ? '—' : `${num(v)} / ${num(item.max)}`;
    case 'range': return v ? fmt(v) : '0';
    case 'count': return v ? `${v} × ${num(item.points)} = ${fmt(item.points * v)}` : '0';
    case 'once': return v ? fmt(item.points) : '—';
    case 'dsq_or': return v === 'penalty' ? fmt(item.points) : v === 'dsq' ? 'DSQ' : '—';
    default: return '';
  }
}

export function sheetTable(protocol, data, ctx = {}) {
  const values = data?.values ?? {};
  const comments = data?.comments ?? {};
  const rows = [];
  for (const sec of protocol.sections) {
    const items = sec.items.filter(i => !i.only || !ctx.apparatus || i.only.includes(ctx.apparatus));
    if (!items.length) continue;
    rows.push(h('tr', { class: 'sec' }, h('th', { colspan: 3 }, sec.title)));
    for (const i of items) {
      rows.push(h('tr', {}, h('td', {}, i.label), h('td', { class: 'num' }, cell(i, values[i.key])), h('td', {}, comments[i.key] ?? '')));
    }
  }
  if (protocol.mandatory && ctx.mandatoryElements?.length) {
    rows.push(h('tr', { class: 'sec' }, h('th', { colspan: 3 }, 'Обовʼязкові елементи')));
    for (const el of ctx.mandatoryElements) {
      const m = data?.mandatory?.[el.id];
      rows.push(h('tr', {}, h('td', {}, el.name),
        h('td', { class: 'num' }, m === true ? 'Зараховано (+1)' : m === false ? 'Не зараховано' : '—'), h('td', {}, '')));
    }
  }
  return h('table', { class: 'sheet' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Критерій'), h('th', { class: 'num' }, 'Оцінка'), h('th', {}, 'Коментар'))),
    h('tbody', {}, rows),
    data?.comment ? h('tfoot', {}, h('tr', {}, h('td', { colspan: 3 }, `Загальний коментар: ${data.comment}`))) : null);
}
