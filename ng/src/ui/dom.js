export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : String(c));
  }
  return el;
}

export function mount(root, ...nodes) {
  root.replaceChildren(...nodes.flat(Infinity).filter(n => n != null && n !== false));
}

export const fmt = (n) => (n == null || Number.isNaN(n)
  ? '—'
  : (Math.round(Number(n) * 100) / 100).toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export const num = (n) => Number(n).toLocaleString('uk-UA', { maximumFractionDigits: 2 });

// Shown when a page cannot load its data: the user can retry without reloading the whole page.
export function retryCard(onRetry) {
  return h('div', { class: 'card' },
    h('p', { class: 'errors' }, 'Немає зʼєднання з сервером.'),
    h('button', { class: 'primary', onclick: onRetry }, 'Спробувати ще'));
}

export function toast(message) {
  const el = h('div', { class: 'toast', role: 'status' }, message);
  document.body.append(el);
  setTimeout(() => el.remove(), 5000);
}
