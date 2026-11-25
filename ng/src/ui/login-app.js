import { supabase } from '../data/client.js';
import { makeApi } from '../data/api.js';
import { h, mount, toast, retryCard } from './dom.js';

const api = makeApi(supabase);
const app = document.getElementById('app');
const rawNext = new URLSearchParams(location.search).get('next');
const next = rawNext && /^(judge|head|admin|print)\.html(\?[\w=&%-]*)?$/.test(rawNext) ? rawNext : null;

function emailForm() {
  const input = h('input', { type: 'email', required: true, autocomplete: 'email', placeholder: 'name@example.com' });
  mount(app,
    h('h1', {}, 'New Generation'),
    h('p', { class: 'muted' }, 'Суддівська платформа. Введіть email — ми надішлемо код для входу.'),
    h('form', {
      class: 'stack',
      onsubmit: async (e) => {
        e.preventDefault();
        const email = input.value.trim().toLowerCase();
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
        if (error) return toast('Не вдалося надіслати код. Спробуйте ще раз за хвилину.');
        codeForm(email);
      },
    }, h('label', {}, 'Email', input), h('button', { class: 'primary' }, 'Отримати код')));
  input.focus();
}

function codeForm(email) {
  const input = h('input', { inputmode: 'numeric', autocomplete: 'one-time-code', required: true, pattern: '[0-9]{6,10}' });
  mount(app,
    h('h1', {}, 'Введіть код'),
    h('p', { class: 'muted' }, `Код надіслано на ${email}. Перевірте також «Спам».`),
    h('form', {
      class: 'stack',
      onsubmit: async (e) => {
        e.preventDefault();
        const { error } = await supabase.auth.verifyOtp({ email, token: input.value.trim(), type: 'email' });
        if (error) return toast('Код невірний або застарів. Спробуйте ще раз.');
        if (next) { location.replace(next); return; }
        roles(email);
      },
    }, h('label', {}, 'Код', input), h('button', { class: 'primary' }, 'Увійти')),
    h('button', { class: 'link', onclick: emailForm }, 'Змінити email'));
  input.focus();
}

async function roles(email) {
  api.touch().catch(() => {});
  let person; let seats;
  try { [person, seats] = await Promise.all([api.person(email), api.mySeats(email)]); } catch { mount(app, h('h1', {}, 'New Generation'), retryCard(() => roles(email))); return; }
  const links = [];
  if (seats.some(s => s.panel !== 'head')) links.push(['judge.html', 'Я суддя — мої протоколи']);
  if (seats.some(s => s.panel === 'head') || person?.is_admin) links.push(['head.html', 'Head Judge — контроль і підтвердження']);
  if (person?.is_admin) links.push(['admin.html', 'Організатор — турнір і результати']);
  if (links.length === 1) { location.replace(links[0][0]); return; }
  mount(app,
    h('h1', {}, 'New Generation'),
    h('p', { class: 'muted' }, email),
    links.length
      ? h('nav', { class: 'stack' }, links.map(([href, label]) => h('a', { class: 'button primary', href }, label)))
      : h('p', { class: 'card' }, 'Для цього email ще немає призначень. Зверніться до організатора турніру.'),
    h('button', { class: 'link', onclick: async () => { await supabase.auth.signOut(); location.reload(); } }, 'Вийти'));
}

(async () => {
  const email = await api.email();
  if (email) {
    if (next) { location.replace(next); return; }
    roles(email);
  } else {
    emailForm();
  }
})();
