import { supabase } from '../data/client.js';
import { makeApi } from '../data/api.js';
import { requireSession, signOut, showNav } from './session.js';
import { h, mount, toast } from './dom.js';
import { uaError } from './errors.js';
import { PANELS_BY_KIND, PANEL_LABELS, APPARATUS_LABELS, ART_ONLY_APPARATUS, ENTRY_TYPE_LABELS, KIND_LABELS } from '../protocols/index.js';
import { parseRoster } from '../admin/csv.js';
import { rankingTable } from './ranking-table.js';

const api = makeApi(supabase);
const app = document.getElementById('app');
document.getElementById('signout').onclick = () => signOut(supabase);

const EXPECTED = { technical: 5, mandatory: 1, artistry: 5, deductions: 1, art: 5, head: 1 };
const TSTATUS = { draft: 'Підготовка', live: 'Триває', finished: 'Завершено' };
const st = { tournament: null, category: null, tab: 'performances' };

const options = (map, selected) => Object.entries(map).map(([v, label]) => h('option', { value: v, selected: v === selected }, label));
const field = (label, input) => h('label', {}, label, input);
const formData = (form) => Object.fromEntries(new FormData(form).entries());
async function run(fn) { try { await fn(); } catch (e) { toast(uaError(e)); } }

function nav() {
  return h('div', { class: 'tabs' },
    h('button', { onclick: () => run(showTournaments) }, 'Турніри'),
    h('button', { onclick: () => run(showPeople) }, 'Судді та організатори'),
    st.tournament ? h('button', { onclick: () => run(() => showTournament(st.tournament)) }, `← ${st.tournament.name}`) : null);
}

// people --------------------------------------------------------------------

async function showPeople() {
  const people = await api.people();
  const form = h('form', {
    class: 'grid-form card',
    onsubmit: (e) => run(async () => {
      e.preventDefault();
      const d = formData(e.target);
      await api.upsertPerson({ email: d.email.trim().toLowerCase(), full_name: d.full_name.trim(), is_admin: d.is_admin === 'on' });
      await showPeople();
    }),
  },
  field('Email', h('input', { name: 'email', type: 'email', required: true })),
  field('Імʼя та прізвище', h('input', { name: 'full_name', required: true })),
  h('label', {}, h('span', {}, 'Організатор'), h('input', { name: 'is_admin', type: 'checkbox', style: 'width:auto;min-height:auto' })),
  h('button', { class: 'primary' }, 'Додати / оновити'));
  mount(app, nav(), h('h1', {}, 'Судді та організатори'),
    h('p', { class: 'muted' }, 'Суддя входить за цим email. Спершу додайте людину тут, потім призначте її в панель категорії.'),
    form,
    h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, 'Імʼя'), h('th', {}, 'Email'), h('th', {}, 'Роль'), h('th', {}, ''))),
      h('tbody', {}, people.map(p => h('tr', {},
        h('td', {}, p.full_name), h('td', {}, p.email), h('td', {}, p.is_admin ? 'Організатор' : 'Суддя'),
        h('td', {}, h('button', { class: 'danger', onclick: () => run(async () => {
          if (!confirm(`Видалити ${p.email}? Призначення в панелях цієї людини теж треба буде прибрати.`)) return;
          await api.remove('people', p.email, 'email'); await showPeople();
        }) }, 'Видалити'))))))));
}

// tournaments ---------------------------------------------------------------

async function showTournaments() {
  st.tournament = null;
  const list = await api.tournaments();
  mount(app, nav(), h('h1', {}, 'Турніри'),
    h('form', {
      class: 'grid-form card',
      onsubmit: (e) => run(async () => {
        e.preventDefault();
        const d = formData(e.target);
        const t = await api.insert('tournaments', { name: d.name.trim(), starts_on: d.starts_on || null });
        await showTournament(t);
      }),
    }, field('Назва', h('input', { name: 'name', required: true, value: 'New Generation' })),
    field('Дата', h('input', { name: 'starts_on', type: 'date' })),
    h('button', { class: 'primary' }, 'Створити турнір')),
    h('ul', { class: 'perf-list' }, list.map(t => h('li', {}, h('button', { class: 'perf', onclick: () => run(() => showTournament(t)) },
      h('span', { class: 'name' }, t.name, h('small', {}, t.starts_on ?? '')), h('span', { class: 'badge' }, TSTATUS[t.status]))))));
}

async function showTournament(t) {
  st.tournament = t;
  st.category = null;
  const cats = await api.categories(t.id);
  mount(app, nav(), h('h1', {}, t.name),
    h('label', { class: 'card' }, 'Статус турніру',
      h('select', { onchange: (e) => run(async () => { st.tournament = await api.update('tournaments', t.id, { status: e.target.value }); }) },
        options(TSTATUS, t.status))),
    h('h2', {}, 'Категорії'),
    h('form', {
      class: 'grid-form card',
      onsubmit: (e) => run(async () => {
        e.preventDefault();
        const d = formData(e.target);
        if (d.kind !== 'art' && ART_ONLY_APPARATUS.includes(d.apparatus)) {
          toast(`${APPARATUS_LABELS[d.apparatus]} судиться лише в типі «${KIND_LABELS.art}».`);
          return;
        }
        await api.insert('categories', {
          tournament_id: t.id, name: d.name.trim(), kind: d.kind, apparatus: d.apparatus,
          age_group: d.age_group.trim(), level: d.level.trim(), entry_type: d.entry_type, sort_order: Number(d.sort_order || 0),
        });
        await showTournament(t);
      }),
    },
    field('Назва', h('input', { name: 'name', required: true, placeholder: 'Pole sport · Діти 8–11 · Аматори' })),
    field('Тип', h('select', { name: 'kind' }, options(KIND_LABELS, 'sport'))),
    field('Снаряд', h('select', { name: 'apparatus' }, options(APPARATUS_LABELS, 'pole'))),
    field('Вікова група', h('input', { name: 'age_group', placeholder: '8–11' })),
    field('Рівень', h('input', { name: 'level', placeholder: 'Аматори' })),
    field('Формат', h('select', { name: 'entry_type' }, options(ENTRY_TYPE_LABELS, 'solo'))),
    field('Порядок', h('input', { name: 'sort_order', type: 'number', value: cats.length + 1 })),
    h('button', { class: 'primary' }, 'Додати категорію')),
    h('ul', { class: 'perf-list' }, cats.map(c => h('li', {}, h('button', { class: 'perf', onclick: () => run(() => showCategory(c)) },
      h('span', { class: 'name' }, c.name, h('small', {}, [KIND_LABELS[c.kind], APPARATUS_LABELS[c.apparatus], c.age_group, c.level, ENTRY_TYPE_LABELS[c.entry_type]].filter(Boolean).join(' · '))))))));
}

// category ------------------------------------------------------------------

async function showCategory(c, requested) {
  const tabs = [['performances', 'Учасниці'], ['seats', 'Судді'], ['results', 'Результати']];
  // Same category keeps its tab; a different category starts on Учасниці; an unavailable tab falls back.
  const wanted = requested ?? (st.category?.id === c.id ? st.tab : 'performances');
  const tab = tabs.some(([key]) => key === wanted) ? wanted : 'performances';
  st.category = c;
  st.tab = tab;
  const body = await ({ performances: perfTab, seats: seatsTab, results: resultsTab }[tab] ?? perfTab)(c);
  mount(app, nav(),
    h('h1', {}, c.name),
    h('p', { class: 'muted' }, [KIND_LABELS[c.kind], APPARATUS_LABELS[c.apparatus], c.age_group, c.level, ENTRY_TYPE_LABELS[c.entry_type]].filter(Boolean).join(' · ')),
    h('div', { class: 'tabs' }, tabs.map(([key, label]) => h('button', { 'aria-selected': String(key === tab), onclick: () => run(() => showCategory(c, key)) }, label)),
      h('button', { class: 'danger', onclick: () => run(async () => {
        if (!confirm(`Видалити категорію «${c.name}» разом з учасницями та протоколами?`)) return;
        await api.remove('categories', c.id); await showTournament(st.tournament);
      }) }, 'Видалити категорію')),
    body);
}

async function perfTab(c) {
  const perfs = await api.performances(c.id);
  const group = c.entry_type !== 'solo';
  return [
    h('form', {
      class: 'grid-form card',
      onsubmit: (e) => run(async () => {
        e.preventDefault();
        const d = formData(e.target);
        await api.insert('performances', { category_id: c.id, start_no: Number(d.start_no), athlete_name: d.athlete_name.trim(), members: (d.members ?? '').trim(), club: d.club.trim(), coach: d.coach.trim() });
        await showCategory(c);
      }),
    },
    field('№', h('input', { name: 'start_no', type: 'number', min: 1, required: true, value: perfs.length + 1 })),
    field(group ? 'Назва дуету / групи' : 'Імʼя та прізвище', h('input', { name: 'athlete_name', required: true })),
    group ? field('Склад', h('input', { name: 'members', placeholder: 'Марія Ч., Софія Л.' })) : null,
    field('Клуб', h('input', { name: 'club' })),
    field('Тренер', h('input', { name: 'coach' })),
    h('button', { class: 'primary' }, 'Додати')),
    h('details', { class: 'card' }, h('summary', {}, 'Вставити список з Excel'),
      h('p', { class: 'muted' }, 'Колонки: № ; Імʼя або назва ; Клуб ; Тренер ; Склад (для дуету/групи). Скопіюйте рядки з Excel і вставте сюди.'),
      (() => {
        const area = h('textarea', { rows: 6 });
        return [area, h('button', { class: 'primary', onclick: () => run(async () => {
          const { rows, errors } = parseRoster(area.value);
          if (errors.length) { toast(errors.join(' · ')); return; }
          await api.insertMany('performances', rows.map(r => ({ ...r, category_id: c.id })));
          toast(`Додано: ${rows.length}`);
          await showCategory(c);
        }) }, 'Імпортувати')];
      })()),
    h('div', { class: 'table-wrap' }, h('table', {},
      h('thead', {}, h('tr', {}, h('th', {}, '№'), h('th', {}, 'Учасниця'), h('th', {}, 'Клуб'), h('th', {}, 'Тренер'), h('th', {}, 'Статус'), h('th', {}, ''))),
      h('tbody', {}, perfs.map(p => h('tr', {},
        h('td', {}, p.start_no), h('td', {}, p.athlete_name, p.members ? h('div', { class: 'muted' }, p.members) : null),
        h('td', {}, p.club), h('td', {}, p.coach), h('td', {}, p.status),
        h('td', {}, h('button', { class: 'danger', onclick: () => run(async () => {
          if (!confirm(`Видалити №${p.start_no} ${p.athlete_name} разом з протоколами?`)) return;
          await api.remove('performances', p.id); await showCategory(c);
        }) }, 'Видалити'))))))),
  ];
}

async function seatsTab(c) {
  const [seats, people] = await Promise.all([api.seats(c.id), api.people()]);
  const names = new Map(people.map(p => [p.email, p.full_name]));
  const panels = PANELS_BY_KIND[c.kind];
  const warnings = panels
    .map(p => [p, seats.filter(s => s.panel === p).length])
    .filter(([p, n]) => n !== EXPECTED[p])
    .map(([p, n]) => `${PANEL_LABELS[p]}: ${n} з ${EXPECTED[p]}`);
  return [
    warnings.length ? h('p', { class: 'errors' }, `Панелі неповні — ${warnings.join(' · ')}. Підсумок рахується з тих, хто є.`) : null,
    h('form', {
      class: 'grid-form card',
      onsubmit: (e) => run(async () => {
        e.preventDefault();
        const d = formData(e.target);
        await api.insert('panel_seats', { category_id: c.id, panel: d.panel, seat_no: Number(d.seat_no), email: d.email });
        await showCategory(c);
      }),
    },
    field('Панель', h('select', { name: 'panel' }, panels.map(p => h('option', { value: p }, PANEL_LABELS[p])))),
    field('Місце №', h('input', { name: 'seat_no', type: 'number', min: 1, value: 1, required: true })),
    field('Суддя', h('select', { name: 'email', required: true }, people.map(p => h('option', { value: p.email }, `${p.full_name || p.email} · ${p.email}`)))),
    h('button', { class: 'primary' }, 'Призначити')),
    panels.map(p => h('section', { class: 'card' }, h('h3', {}, PANEL_LABELS[p]),
      h('ul', {}, seats.filter(s => s.panel === p).map(s => h('li', {},
        `№${s.seat_no} · ${names.get(s.email) || s.email} `,
        h('button', { class: 'link', onclick: () => run(async () => {
          if (!confirm('Прибрати суддю з панелі? Його протоколи в цій категорії буде видалено.')) return;
          await api.remove('panel_seats', s.id); await showCategory(c);
        }) }, 'прибрати')))))),
  ];
}

async function resultsTab(c) {
  const [perfs, results] = await Promise.all([api.performances(c.id), api.results(c.id)]);
  const confirmed = perfs.filter(p => p.status !== 'pending').length;
  return [
    h('p', { class: 'muted' }, `Підтверджено ${confirmed} з ${perfs.length} виступів.`),
    h('div', { class: 'tabs' },
      h('a', { class: 'button', href: `head.html?category=${c.id}` }, 'Відкрити як Head Judge'),
      h('a', { class: 'button primary', href: `print.html?category=${c.id}`, target: '_blank' }, 'Друк / PDF протоколів')),
    rankingTable(c.kind, perfs, results),
  ];
}

(async () => {
  const email = await requireSession(supabase);
  showNav(api, email, 'admin');
  await run(async () => {
    const me = await api.person(email);
    if (!me?.is_admin) {
      mount(app, h('p', { class: 'card' }, 'Ця сторінка лише для організаторів.'), h('a', { class: 'button', href: 'index.html' }, 'На головну'));
      return;
    }
    await showTournaments();
  });
})();
