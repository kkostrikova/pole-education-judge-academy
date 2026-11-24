import { h, fmt } from './dom.js';
import { rankCategory } from '../scoring/ranking.js';

const n = (v) => (v == null ? null : Number(v));

export function rankingTable(kind, performances, results) {
  const byPerf = new Map(results.map(r => [r.performance_id, r]));
  const rows = rankCategory(performances.map(p => {
    const r = byPerf.get(p.id);
    return { performanceId: p.id, perf: p, result: r, status: p.status, final: n(r?.final), tiebreak: n(r?.tiebreak) };
  }));
  const sport = kind === 'sport';
  return h('div', { class: 'table-wrap' }, h('table', { class: 'ranking' },
    h('thead', {}, h('tr', {},
      h('th', {}, 'Місце'), h('th', {}, '№'), h('th', {}, 'Учасниця / склад'), h('th', {}, 'Клуб'),
      sport ? [h('th', { class: 'num' }, 'Техніка'), h('th', { class: 'num' }, 'Обовʼязкові'), h('th', { class: 'num' }, 'Артистизм'), h('th', { class: 'num' }, 'Збавки'), h('th', { class: 'num' }, 'Штрафи HJ')] : null,
      sport ? null : h('th', { class: 'num' }, 'Штрафи HJ'),
      h('th', { class: 'num' }, 'Підсумок'))),
    h('tbody', {}, rows.map(r => h('tr', {},
      h('td', {}, r.place ?? (r.status === 'dsq' ? 'DSQ' : '—')),
      h('td', {}, r.perf.start_no),
      h('td', {}, r.perf.athlete_name, r.perf.members ? h('div', { class: 'muted' }, r.perf.members) : null),
      h('td', {}, r.perf.club),
      sport ? [n(r.result?.technical), n(r.result?.mandatory), n(r.result?.artistry), n(r.result?.deductions), n(r.result?.head_penalties)]
        .map(v => h('td', { class: 'num' }, fmt(v))) : h('td', { class: 'num' }, fmt(n(r.result?.head_penalties))),
      h('td', { class: 'num' }, h('strong', {}, r.status === 'dsq' ? '—' : fmt(r.final))))))));
}
