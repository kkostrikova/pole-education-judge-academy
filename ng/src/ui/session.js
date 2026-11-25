import { h, mount, toast } from './dom.js';

// First visit: ask for the judge's name once; it is shown to the Head Judge and on the printed protocols.
export async function ensureName(api, email, root) {
  let person;
  try { person = await api.person(email); } catch { return; }
  if (!person || person.full_name?.trim()) return;
  await new Promise((resolve) => {
    const input = h('input', { required: true, autocomplete: 'name', placeholder: 'Марія Іваненко' });
    mount(root,
      h('h1', {}, 'Знайомство'),
      h('p', { class: 'muted' }, 'Вкажіть імʼя та прізвище. Це робиться один раз: вас побачить Head Judge, воно буде на друкованих протоколах.'),
      h('form', {
        class: 'stack',
        onsubmit: async (e) => {
          e.preventDefault();
          const name = input.value.trim().replace(/\s+/g, ' ');
          if (!/\S+\s+\S+/.test(name)) return toast('Напишіть імʼя та прізвище.');
          try { await api.setMyName(name); resolve(); } catch { toast('Не вдалося зберегти. Спробуйте ще раз.'); }
        },
      }, h('label', {}, 'Імʼя та прізвище', input), h('button', { class: 'primary' }, 'Зберегти')));
    input.focus();
  });
}

// "Імʼя: …" in the header: a judge fixes or changes their own name (e.g. when another person takes the phone).
export async function showNameEditor(api, email, doc = document) {
  const anchor = doc.getElementById('signout');
  let person;
  try { person = await api.person(email); } catch { return; }
  if (!anchor || !person) return;
  const btn = h('button', { class: 'link', type: 'button', id: 'myname' });
  const label = () => { btn.textContent = (person.full_name || 'Вкажіть імʼя') + ' ✎'; };
  label();
  btn.addEventListener('click', async () => {
    const answer = window.prompt('Імʼя та прізвище того, хто зараз судить:', person.full_name || '');
    if (answer == null) return;
    const name = answer.trim().replace(/\s+/g, ' ');
    if (!/\S+\s+\S+/.test(name)) return toast('Напишіть імʼя та прізвище.');
    try { person = await api.setMyName(name); label(); toast('Імʼя збережено'); } catch { toast('Не вдалося зберегти. Спробуйте ще раз.'); }
  });
  anchor.before(btn);
}

// Main menu under the title bar: every section this person can open, the current one highlighted.
// A judge with only one section gets no menu.
export async function showNav(api, email, current, doc = document) {
  const bar = doc.querySelector('.topbar');
  let person; let seats;
  try { [person, seats] = await Promise.all([api.person(email), api.mySeats(email)]); } catch { return; }
  const admin = Boolean(person?.is_admin);
  const sections = [
    seats.some(s => s.panel !== 'head') && ['judge', 'judge.html', 'Мої протоколи'],
    (admin || seats.some(s => s.panel === 'head')) && ['head', 'head.html', 'Head Judge'],
    admin && ['admin', 'admin.html', 'Організатор'],
  ].filter(Boolean);
  if (!bar || sections.length < 2) return;
  bar.append(h('nav', { class: 'mainnav', 'aria-label': 'Розділи' },
    [['home', 'index.html', 'Головна'], ...sections].map(([key, href, label]) =>
      h('a', { href, 'aria-current': key === current ? 'page' : null }, label))));
}

export async function requireSession(sb) {
  const { data } = await sb.auth.getSession();
  const email = data.session?.user?.email;
  if (email) return email.toLowerCase();
  const here = location.pathname.split('/').pop() + location.search;
  location.replace(`index.html?next=${encodeURIComponent(here)}`);
  return new Promise(() => {});
}

export async function signOut(sb, queue) {
  const n = queue?.size() ?? 0;
  if (n > 0 && !confirm(`Є неотримані сервером оцінки (${n}). Вийти все одно?`)) return;
  await sb.auth.signOut();
  location.replace('index.html');
}

// Used by the save-queue `send` wrappers. Without a session the server would reject
// the sheet (42501) and the queue would drop it, so we fail WITHOUT a `code`: the item
// stays queued as "offline" and goes out after the judge signs in again.
export async function ensureSessionForSync(sb, next) {
  const { data, error } = await sb.auth.getSession();
  if (error) throw new Error('session check failed');
  if (data?.session) { document.getElementById('session-banner')?.remove(); return; }
  if (!document.getElementById('session-banner')) {
    const banner = document.createElement('div');
    banner.id = 'session-banner';
    banner.className = 'errors';
    banner.setAttribute('role', 'alert');
    banner.append('Сесія завершилась — увійдіть знову, оцінки збережені на пристрої. ');
    const link = document.createElement('a');
    link.href = `index.html?next=${encodeURIComponent(next)}`;
    link.textContent = 'Увійти';
    banner.append(link);
    document.body.prepend(banner);
  }
  throw new Error('no session');
}
