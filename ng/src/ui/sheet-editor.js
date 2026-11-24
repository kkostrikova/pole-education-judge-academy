import { h } from './dom.js';
import { renderProtocolForm } from './protocol-form.js';
import { submitErrors } from '../scoring/sheet.js';

export const sheetKey = (perfId, seatId) => `${perfId}:${seatId}`;

export function sheetEditor({ protocol, ctx, perf, seatId, queue, data, locked, onSubmitted = () => {} }) {
  const id = sheetKey(perf.id, seatId);
  let latest = data ?? {};
  let timer;
  const formEl = h('div', { class: 'protocol' });
  renderProtocolForm(formEl, {
    protocol, apparatus: ctx.apparatus, mandatoryElements: ctx.mandatoryElements ?? [], data: latest, readOnly: locked,
    onChange: (d) => {
      const known = new Set((ctx.mandatoryElements ?? []).map(e => e.id));
      d.mandatory = Object.fromEntries(Object.entries(d.mandatory ?? {}).filter(([k]) => known.has(k))); // drop stale ids
      latest = d;
      queue.stage({ id, performanceId: perf.id, seatId, data: d, submit: false });
      clearTimeout(timer);
      timer = setTimeout(() => queue.flush(), 800);
    },
  });
  const errorsEl = h('div', { class: 'errors', role: 'alert' });

  const submit = () => {
    const errs = submitErrors(protocol, latest, ctx);
    if (errs.length) {
      errorsEl.replaceChildren(h('p', {}, 'Перед надсиланням виправте:'), h('ul', {}, errs.map(e => h('li', {}, e))));
      errorsEl.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!window.confirm(`Надіслати протокол №${perf.start_no}? Після цього змінити його зможе лише Head Judge.`)) return;
    clearTimeout(timer);
    queue.stage({ id, performanceId: perf.id, seatId, data: latest, submit: true });
    queue.flush();
    onSubmitted();
  };

  return h('div', { class: 'sheet-editor' }, formEl, errorsEl,
    locked
      ? h('p', { class: 'locked-note' }, 'Протокол надіслано. Змінити його може лише Head Judge.')
      : h('button', { type: 'button', class: 'primary big', onclick: submit }, 'Надіслати протокол'));
}
