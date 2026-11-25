import { h, mount, fmt, num } from './dom.js';
import { sheetTotal, MAX_COUNT } from '../scoring/sheet.js';

export function steps(from, to, step) {
  const n = Math.round(Math.abs(to - from) / step);
  const dir = to >= from ? 1 : -1;
  return Array.from({ length: n + 1 }, (_, i) => Math.round((from + dir * i * step) * 100) / 100 + 0);
}

const signed = (p) => (p > 0 ? `+${num(p)}` : num(p));
const visible = (item, apparatus) => !item.only || !apparatus || item.only.includes(apparatus);

export function renderProtocolForm(root, { protocol, apparatus, data, readOnly = false, onChange = () => {} }) {
  const src = structuredClone(data ?? {});
  const state = { comment: '', ...src, values: { ...src.values }, comments: { ...src.comments } };
  const ctx = { apparatus };

  const emit = (rerender = true) => { onChange(structuredClone(state)); if (rerender) render(); };
  const setValue = (key, v) => { state.values[key] = v; emit(); };

  const chip = (label, attrs, onclick) => h('button', {
    type: 'button', class: `chip${attrs.on ? ' is-on' : ''}`, disabled: readOnly, 'aria-pressed': attrs.on ? 'true' : 'false',
    'data-item': attrs.item, 'data-value': attrs.value, 'data-action': attrs.action, onclick,
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
        const calc = (k) => `${signed(item.points)} × ${k} = ${fmt(item.points * k + 0)}`;
        const note = h('span', { class: 'muted' }, calc(n));
        const clamp = (k) => Math.min(MAX_COUNT, Math.max(0, k));
        // Typed by hand: update in place, because re-rendering would drop the keyboard focus.
        const input = h('input', {
          class: 'count', type: 'text', inputmode: 'numeric', pattern: '[0-9]*', maxlength: String(MAX_COUNT).length,
          'aria-label': `${item.label}: кількість`, 'data-item': item.key, 'data-action': 'type', disabled: readOnly, value: String(n),
          onfocus: (e) => e.target.select(),
          oninput: (e) => {
            const k = clamp(Number(e.target.value.replace(/\D/g, '') || 0));
            if (e.target.value !== '') e.target.value = String(k);
            state.values[item.key] = k;
            note.textContent = calc(k);
            root.querySelector('[data-testid="total"]').textContent = totalText();
            emit(false);
          },
          onblur: (e) => { if (e.target.value === '') e.target.value = String(state.values[item.key] ?? 0); },
        });
        // The buttons read the current value, which may have been typed since this row was drawn.
        const step = (d) => () => setValue(item.key, clamp((state.values[item.key] ?? 0) + d));
        return h('div', { class: 'counter' },
          chip('−', { item: item.key, action: 'dec' }, step(-1)),
          input,
          chip('+', { item: item.key, action: 'inc' }, step(1)),
          note);
      }
      case 'once':
        if (item.choice) {
          return h('div', { class: 'chips' },
            chip('Зараховано', { on: v === true, item: item.key, value: 'true' }, () => setValue(item.key, true)),
            chip('Не зараховано', { on: v === false, item: item.key, value: 'false' }, () => setValue(item.key, false)));
        }
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
      h('label', { class: 'proto-comment' }, 'Загальний коментар',
        h('textarea', { rows: 3, disabled: readOnly, oninput: (e) => { state.comment = e.target.value; emit(false); } }, state.comment ?? '')),
      h('div', { class: 'total-bar' }, 'Разом: ', h('strong', { 'data-testid': 'total' }, totalText())));
  }

  render();
  return { getData: () => structuredClone(state) };
}
