import { h, mount, fmt, num } from './dom.js';
import { sheetTotal } from '../scoring/sheet.js';

export function steps(from, to, step) {
  const n = Math.round(Math.abs(to - from) / step);
  const dir = to >= from ? 1 : -1;
  return Array.from({ length: n + 1 }, (_, i) => Math.round((from + dir * i * step) * 100) / 100 + 0);
}

const signed = (p) => (p > 0 ? `+${num(p)}` : num(p));
const visible = (item, apparatus) => !item.only || !apparatus || item.only.includes(apparatus);

export function renderProtocolForm(root, { protocol, apparatus, mandatoryElements = [], data, readOnly = false, onChange = () => {} }) {
  const src = structuredClone(data ?? {});
  const state = { comment: '', ...src, values: { ...src.values }, comments: { ...src.comments }, mandatory: { ...src.mandatory } };
  const ctx = { apparatus, mandatoryElements };

  const emit = (rerender = true) => { onChange(structuredClone(state)); if (rerender) render(); };
  const setValue = (key, v) => { state.values[key] = v; emit(); };

  const chip = (label, attrs, onclick) => h('button', {
    type: 'button', class: `chip${attrs.on ? ' is-on' : ''}`, disabled: readOnly, 'aria-pressed': attrs.on ? 'true' : 'false',
    'data-item': attrs.item, 'data-value': attrs.value, 'data-action': attrs.action, 'data-element': attrs.element, onclick,
  }, label);

  function control(item) {
    const v = state.values[item.key];
    switch (item.type) {
      case 'score':
      case 'range': {
        const values = item.type === 'score' ? steps(0, item.max, item.step) : steps(0, item.min, item.step);
        return h('div', { class: 'chips' }, values.map(s =>
          chip(num(s), { on: v === s, item: item.key, value: String(s) }, () => setValue(item.key, s))));
      }
      case 'count': {
        const n = v ?? 0;
        return h('div', { class: 'counter' },
          chip('−', { item: item.key, action: 'dec' }, () => setValue(item.key, Math.max(0, n - 1))),
          h('output', { class: 'count' }, String(n)),
          chip('+', { item: item.key, action: 'inc' }, () => setValue(item.key, Math.min(50, n + 1))),
          h('span', { class: 'muted' }, `${signed(item.points)} × ${n} = ${fmt(item.points * n)}`));
      }
      case 'once':
        return chip(v ? `Застосовано ${signed(item.points)}` : `Ні (${signed(item.points)})`,
          { on: v === true, item: item.key, action: 'toggle' }, () => setValue(item.key, !v));
      case 'dsq_or':
        return h('div', { class: 'chips' }, [['none', 'Ні'], ['penalty', `Штраф ${signed(item.points)}`], ['dsq', 'DSQ']]
          .map(([val, label]) => chip(label, { on: (v ?? 'none') === val, item: item.key, value: val }, () => setValue(item.key, val))));
      default:
        return null;
    }
  }

  const row = (item) => h('div', { class: 'proto-row', 'data-row': item.key },
    h('div', { class: 'proto-label' }, item.label, item.type === 'score' ? h('span', { class: 'muted' }, ` · макс. ${num(item.max)}`) : null),
    control(item),
    h('details', { class: 'proto-note', open: Boolean(state.comments[item.key]) || Boolean(item.requiresComment) },
      h('summary', {}, item.requiresComment ? 'Коментар (обовʼязковий)' : 'Коментар'),
      h('textarea', { rows: 2, disabled: readOnly, oninput: (e) => { state.comments[item.key] = e.target.value; emit(false); } },
        state.comments[item.key] ?? '')));

  function mandatoryBlock() {
    if (!protocol.mandatory || !mandatoryElements.length) return null;
    return h('section', { class: 'proto-section' },
      h('h3', {}, 'Обовʼязкові елементи · +1 за кожен зарахований'),
      mandatoryElements.map(el => {
        const v = state.mandatory[el.id];
        const set = (val) => () => { state.mandatory[el.id] = val; emit(); };
        return h('div', { class: 'proto-row' },
          h('div', { class: 'proto-label' }, el.name,
            el.criteria?.length ? h('ul', { class: 'criteria' }, el.criteria.map(c => h('li', {}, c))) : null),
          h('div', { class: 'chips' },
            chip('Зараховано', { on: v === true, element: el.id, value: 'true' }, set(true)),
            chip('Не зараховано', { on: v === false, element: el.id, value: 'false' }, set(false))));
      }));
  }

  function totalText() {
    try { return fmt(sheetTotal(protocol, state, ctx).total); } catch { return '—'; }
  }

  function render() {
    mount(root,
      h('header', { class: 'proto-head' }, h('h2', {}, protocol.title), protocol.hint ? h('p', { class: 'muted' }, protocol.hint) : null),
      protocol.sections.map(sec => {
        const items = sec.items.filter(i => visible(i, apparatus));
        return items.length ? h('section', { class: 'proto-section' }, h('h3', {}, sec.title), items.map(row)) : null;
      }),
      mandatoryBlock(),
      h('label', { class: 'proto-comment' }, 'Загальний коментар',
        h('textarea', { rows: 3, disabled: readOnly, oninput: (e) => { state.comment = e.target.value; emit(false); } }, state.comment ?? '')),
      h('div', { class: 'total-bar' }, 'Разом: ', h('strong', { 'data-testid': 'total' }, totalText())));
  }

  render();
  return { getData: () => structuredClone(state) };
}
