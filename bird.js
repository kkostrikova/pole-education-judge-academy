/* Pole Education — the bird reacts where a reaction belongs.

   Two places: the moment a module test is marked, and the empty states that
   are otherwise a grey line of text. It used to sit on the completed badge
   of every module card too — eight rendered characters at 44px, each a
   different height, animating at once inside a chip whose whole job is to
   state one fact at a glance. The card grid reads as a system; the bird is
   an illustration. Mixing them made the grid restless and made the bird
   cheap, and at that size none of what makes it charming is even visible.
   It earns its place where it arrives once, large, at a moment that has
   feeling in it.

   Not in the hero, not beside headings, and never in the final exam. */
(() => {
  if (document.body.dataset.peExam === '1') return;

  const FLAP = 'assets/bird/flap.webp?v=20260914-bird8';
  const SWAY = 'assets/bird/sway.webp?v=20260914-bird9';
  /* One bird per module, chosen to suit it: settled on a leaf for planning,
     peering about for the stage survey, eyes closed for the ethics code, in
     flight for difficulty, the author's favourite close-up for deductions,
     cheering for artistry, winking for the compulsory elements, and the
     stern one for the head judge. All ten cells wide, all played ping-pong. */
  const POSE_H = {
    1: { h: 97 },
    2: { h: 125 },
    3: { h: 139 },
    4: { h: 96 },
    5: { h: 123 },
    6: { h: 121 },
    7: { h: 125 },
    8: { h: 93 }
  };
  const poseSrc = n => 'assets/bird/m' + n + '.webp?v=20260914-bird13';
  const ALT = {
    happy: 'Тест складено',
    sad:   'Спробуйте ще раз'
  };

  /* Both result poses are strips of cells played with steps(), so they move
     the way they do in the clip instead of sitting there: the cheering one
     beats its wings, the sympathetic one only breathes and sways. */
  const STRIP = {
    happy: { src: FLAP, mod: 'pe-bird--flap' },
    sad:   { src: SWAY, mod: 'pe-bird--sway' }
  };

  /* the module a page (or a card) belongs to; 5 is the fallback, which is
     the pose the author picked as her favourite */
  const PAGE_MODULE = Number((location.pathname.match(/module-(\d)\.html/) || [])[1]) || 0;

  function pose(n, cls) {
    const i = n >= 1 && n <= 8 ? n : 5;
    const el = document.createElement('span');
    el.className = 'pe-bird pe-bird--pose ' + cls;
    el.style.backgroundImage = 'url(' + poseSrc(i) + ')';
    el.style.aspectRatio = '110 / ' + POSE_H[i].h;
    el.setAttribute('aria-hidden', 'true');
    return el;
  }

  function make(kind, cls) {
    const strip = STRIP[kind];
    const el = document.createElement('span');
    el.className = 'pe-bird ' + strip.mod + ' ' + cls;
    el.style.backgroundImage = 'url(' + strip.src + ')';
    if (ALT[kind]) {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', ALT[kind]);
    } else {
      el.setAttribute('aria-hidden', 'true');
    }
    return el;
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

  /* ── empty states ─────────────────────────────────────── */
  document.querySelectorAll('[data-pe-empty]').forEach(el => {
    if (el.querySelector('.pe-bird')) return;
    el.prepend(pose(PAGE_MODULE, 'pe-bird--empty'));
  });
})();
