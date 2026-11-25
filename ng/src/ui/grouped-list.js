import { h, mount } from './dom.js';

// Direction buttons over long category lists: only one direction is on screen at a time.
const SPORT_GROUPS = [
  ['pole', 'Pole Sport'],
  ['silks', 'Aerial Silk Sport'],
  ['hoop', 'Aerial Hoop Sport'],
];
const ORDER = [...SPORT_GROUPS.map(([key]) => key), 'art'];

export function categoryGroup(category) {
  if (category.kind === 'art') return { key: 'art', label: 'Art' };
  const found = SPORT_GROUPS.find(([key]) => key === category.apparatus);
  return found ? { key: found[0], label: found[1] } : { key: category.apparatus, label: category.apparatus };
}

const read = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key, value) => { try { localStorage.setItem(key, value); } catch { /* private mode: not remembered */ } };

export function groupedList({ items, categoryOf, renderItem, storageKey }) {
  const groups = new Map();
  for (const item of items) {
    const category = categoryOf(item);
    const g = categoryGroup(category);
    if (!groups.has(g.key)) groups.set(g.key, { ...g, items: [] });
    groups.get(g.key).items.push(item);
  }
  const sorted = [...groups.values()].sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
  for (const g of sorted) {
    g.items.sort((a, b) => {
      const x = categoryOf(a); const y = categoryOf(b);
      return (x.sort_order ?? 0) - (y.sort_order ?? 0) || x.name.localeCompare(y.name, 'uk');
    }); // stable: several seats in one category keep their incoming order
  }

  const root = h('div', {});
  let active = sorted.find(g => g.key === read(storageKey))?.key ?? sorted[0]?.key;
  const draw = () => mount(root,
    sorted.length > 1
      ? h('div', { class: 'tabs groups', role: 'tablist' }, sorted.map(g => h('button', {
        type: 'button', role: 'tab', 'aria-selected': String(g.key === active), 'data-group': g.key,
        onclick: () => { active = g.key; write(storageKey, active); draw(); },
      }, g.label)))
      : null,
    h('ul', { class: 'perf-list' }, (sorted.find(g => g.key === active)?.items ?? []).map(item => h('li', {}, renderItem(item)))));
  draw();
  return root;
}
