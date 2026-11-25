import { h, toast } from './dom.js';

// Marks the person as present while the page is open (shown to the organizer in «Активність»).
export function startPresence(api, doc = document) {
  const beat = () => { if (doc.visibilityState !== 'hidden') Promise.resolve(api.touch()).catch(() => {}); };
  beat();
  doc.addEventListener('visibilitychange', beat);
  return setInterval(beat, 60000);
}

// «Відгук» in the header. The form sits outside #app, so page re-renders never wipe typed text.
export function showFeedbackButton(api, page, doc = document) {
  const anchor = doc.getElementById('signout');
  const app = doc.getElementById('app');
  if (!anchor || !app) return;
  const area = h('textarea', { rows: 4, maxlength: 2000, required: true, placeholder: 'Що подобається, що незручно, чого бракує?' });
  const form = h('form', {
    class: 'stack card feedback', hidden: true,
    onsubmit: async (e) => {
      e.preventDefault();
      const message = area.value.trim();
      if (!message) return toast('Напишіть кілька слів.');
      try {
        await api.sendFeedback(message, page);
        area.value = '';
        form.hidden = true;
        toast('Дякуємо! Відгук надіслано.');
      } catch { toast('Не вдалося надіслати. Текст збережено, спробуйте ще раз.'); }
    },
  },
  h('label', {}, 'Ваш відгук', area),
  h('button', { class: 'primary' }, 'Надіслати'),
  h('button', { type: 'button', class: 'link', onclick: () => { form.hidden = true; } }, 'Закрити'));
  anchor.before(h('button', {
    type: 'button', id: 'feedback',
    onclick: () => { form.hidden = !form.hidden; if (!form.hidden) { form.scrollIntoView?.({ block: 'start' }); area.focus(); } },
  }, 'Відгук'));
  app.before(h('div', { class: 'page feedback-wrap' }, form));
}
