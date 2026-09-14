/* Pole Education — the sorting trainers, by tap and by keyboard.

   Modules 4, 5 and 7 all ask the reader to move cards into groups, and all
   three were built on HTML5 drag-and-drop. Module 7 later grew a tap
   fallback; 4 and 5 never did, so on a phone those two exercises could not
   be completed at all — a tap on a card and then on a zone did nothing.
   Neither could be done from the keyboard.

   Rather than reimplement three different sorters, this drives the ones the
   pages already have: picking a card and activating a zone dispatches a real
   dragstart/drop pair, so each module's own handler runs, with its own
   counters and its own marking. Module 7 already answers a tap, so there it
   only adds keyboard operation and forwards to the page's click handler. */
(() => {
  const SYSTEMS = [
    { card: '.drag-card', zones: ['.drop-zone', '.sort-pool'], host: '.sorter' },
    { card: '.sort-card', zones: ['.sort-zone', '#freqPool'],  host: '.sorter, #frequency' },
    { card: '.jc-card',   zones: ['.jc-zone', '.jc-pool'],     host: '.jc-layout', native: true }
  ].filter(s => document.querySelector(s.card) || document.querySelector(s.zones[0]));
  if (!SYSTEMS.length) return;

  const T = {
    hint: 'Перетягніть картку або натисніть її, а потім потрібну групу. З клавіатури: Tab, далі Enter.',
    picked: c => `Обрано: ${c}. Тепер оберіть групу.`,
    placed: (c, z) => `${c} → ${z}`,
    cleared: 'Вибір знято'
  };

  const live = document.createElement('p');
  live.className = 'mk-dnd-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  const say = t => { live.textContent = t; };

  const label = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70);
  const zoneName = z => {
    const h = z.querySelector('h3, h4');
    return h ? label(h) : 'загальний пул';
  };

  let picked = null;
  function pick(card) {
    if (picked === card) return unpick();
    unpick();
    picked = card;
    card.classList.add('mk-picked');
    card.setAttribute('aria-pressed', 'true');
    say(T.picked(label(card)));
  }
  function unpick(quiet) {
    if (!picked) return;
    picked.classList.remove('mk-picked');
    picked.setAttribute('aria-pressed', 'false');
    picked = null;
    if (!quiet) say(T.cleared);
  }

  /* Drive the page's own drop handler instead of moving the node here: the
     modules bind their counters and their marking to those events. */
  function place(card, zone) {
    const dt = new DataTransfer();
    dt.setData('text/plain', card.dataset.id || '');
    card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }));
    zone.dispatchEvent(new DragEvent('dragover',  { bubbles: true, cancelable: true, dataTransfer: dt }));
    zone.dispatchEvent(new DragEvent('drop',      { bubbles: true, cancelable: true, dataTransfer: dt }));
    card.dispatchEvent(new DragEvent('dragend',   { bubbles: true, cancelable: true, dataTransfer: dt }));
    say(T.placed(label(card), zoneName(zone)));
  }

  const sysOf = el => SYSTEMS.find(s => el.matches(s.card) || el.closest(s.zones.join(',')));

  function cardIn(el) {
    for (const s of SYSTEMS) { const c = el.closest(s.card); if (c) return [c, s]; }
    return [null, null];
  }
  function zoneIn(el) {
    for (const s of SYSTEMS) {
      const z = el.closest(s.zones.join(','));
      if (z) return [z, s];
    }
    return [null, null];
  }

  document.addEventListener('click', e => {
    const [card, cs] = cardIn(e.target);
    if (card) { if (cs.native) say(T.picked(label(card))); else pick(card); return; }
    const [zone, zs] = zoneIn(e.target);
    if (!zone) return;
    if (zs.native) { const c = zone.querySelector(zs.card + '.selected'); say(T.placed(c ? label(c) : 'Картку', zoneName(zone))); return; }
    if (picked) { const c = picked; unpick(true); place(c, zone); }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { unpick(); return; }
    if (e.key !== 'Enter' && e.key !== ' ' && e.key !== 'Spacebar') return;
    const [card, cs] = cardIn(e.target);
    if (card) {
      e.preventDefault();
      if (cs.native) { card.click(); say(T.picked(label(card))); } else pick(card);
      return;
    }
    const [zone, zs] = zoneIn(e.target);
    if (zone) {
      e.preventDefault();
      if (zs.native) {
        const c = document.querySelector(zs.card + '.selected');
        const name = c ? label(c) : 'Картку';
        zone.click();
        say(T.placed(name, zoneName(zone)));
        return;
      }
      if (picked) { const c = picked; unpick(true); place(c, zone); }
    }
  });

  /* Cards and zones are re-rendered on every reset and tab switch, so the
     roles are stamped on whatever is in the DOM rather than once at load. */
  function stamp() {
    SYSTEMS.forEach(s => {
      document.querySelectorAll(s.card).forEach(c => {
        if (c.tabIndex >= 0) return;
        c.tabIndex = 0;
        c.setAttribute('role', 'button');
        c.setAttribute('aria-pressed', 'false');
      });
      document.querySelectorAll(s.zones.join(',')).forEach(z => {
        if (z.tabIndex >= 0) return;
        z.tabIndex = 0;
        z.setAttribute('role', 'group');
      });
    });
  }
  stamp();
  new MutationObserver(stamp).observe(document.body, { childList: true, subtree: true });

  /* Module 7 says so already; 4 and 5 said nothing at all */
  SYSTEMS.filter(s => !s.native).forEach(s => {
    const host = s.host && document.querySelector(s.host);
    if (!host || host.querySelector('.mk-dnd-hint')) return;
    const p = document.createElement('p');
    p.className = 'mk-dnd-hint';
    p.textContent = T.hint;
    host.prepend(p);
  });
})();
