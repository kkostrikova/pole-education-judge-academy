/* Pole Education — the bird reacts where a reaction belongs.
   Three places only, agreed with the author: the moment a module test is
   marked, the completed badge on a module card, and the empty states that
   are otherwise a grey line of text. Not in the hero, not beside headings,
   and never in the final exam, which stays formal. */
(() => {
  if (document.body.dataset.peExam === '1') return;

  const SRC = {
    happy: 'assets/bird/happy.webp?v=20260914-bird1',
    sad:   'assets/bird/sad.webp?v=20260914-bird1',
    idle:  'assets/bird/idle.webp?v=20260914-bird1',
    leaf:  'assets/bird/leaf.webp?v=20260914-bird1'
  };
  const ALT = {
    happy: 'Тест складено',
    sad:   'Спробуйте ще раз',
    idle:  '',
    leaf:  'Модуль завершено'
  };

  function make(kind, cls) {
    const img = document.createElement('img');
    img.className = 'pe-bird ' + cls;
    img.src = SRC[kind];
    img.alt = ALT[kind];
    if (!ALT[kind]) img.setAttribute('aria-hidden', 'true');
    img.decoding = 'async';
    img.loading = 'lazy';
    return img;
  }

  /* ── module test result ───────────────────────────────────
     Modules report the outcome in four different ways, so read them in
     order of how certain each one is: an explicit class, then the score the
     text states, then the wording. */
  function verdict(el) {
    if (el.classList.contains('pass')) return true;
    if (el.classList.contains('fail')) return false;
    const t = (el.textContent || '').replace(/ /g, ' ');
    const pct = t.match(/(\d{1,3})\s*%/);
    if (pct) {
      const n = Number(pct[1]);
      // "потрібно щонайменше 80%" states the threshold, not the score
      if (!/потрібн\w*\s*(щонайменше\s*)?$/i.test(t.slice(0, pct.index))) return n >= 80;
    }
    /* modules 4 and 5 report a bare score with no percentage at all:
       "Результат: 0 / 7. Повернися до ключових критеріїв" */
    const frac = t.match(/(\d{1,3})\s*\/\s*(\d{1,3})/);
    if (frac && Number(frac[2]) > 0) return Number(frac[1]) / Number(frac[2]) >= 0.8;
    if (/\bне\s+складено|потрібн|спробу|поверни|повтори/i.test(t)) return false;
    if (/складено|засвоєн|відкрито|зарахован/i.test(t)) return true;
    return null;
  }

  function markResult(el) {
    const visible = el.offsetParent !== null && (el.textContent || '').trim().length > 0;
    const old = el.querySelector(':scope > .pe-bird');
    if (!visible) { if (old) old.remove(); return; }
    const v = verdict(el);
    if (v === null) { if (old) old.remove(); return; }
    const want = v ? 'happy' : 'sad';
    if (old && old.dataset.kind === want) return;
    if (old) old.remove();
    const img = make(want, 'pe-bird--result');
    img.dataset.kind = want;
    el.classList.add('has-bird');
    el.appendChild(img);
  }

  /* Each module names its result panel differently — .result, .quiz-result,
     .resultbox — and two of them use the id #qres rather than #quizResult.
     Missing .resultbox is why modules 2 and 8 had no bird at all. */
  const results = [...document.querySelectorAll(
    '#quizResult, #qres, .result, .quiz-result, .resultbox')];
  if (results.length) {
    const io = new MutationObserver(() => results.forEach(markResult));
    results.forEach(el => {
      markResult(el);
      io.observe(el, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ── completed badge on the module cards ──────────────── */
  function markCards() {
    document.querySelectorAll('.module-status.done').forEach(s => {
      if (s.querySelector('.pe-bird')) return;
      s.prepend(make('leaf', 'pe-bird--badge'));
    });
  }
  const grid = document.getElementById('moduleGrid');
  if (grid) {
    markCards();
    new MutationObserver(markCards).observe(grid, { childList: true, subtree: true });
  }

  /* ── empty states ─────────────────────────────────────── */
  document.querySelectorAll('[data-pe-empty]').forEach(el => {
    if (el.querySelector('.pe-bird')) return;
    el.prepend(make('idle', 'pe-bird--empty'));
  });
})();
