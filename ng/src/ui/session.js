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
