/* Pole Education — shared chrome for the eight module pages.

   Each module is a stand-alone file with its own inline stylesheet, so the
   only way to make them behave as one product without rewriting all eight
   is a layer that reads the markup they already have. It expects very
   little: a .wrap, a first card carrying `a.back`, and a <nav> of in-page
   links. Everything else it prints itself. */
(() => {
  const n = Number((location.pathname.match(/module-(\d)\.html/) || [])[1]);
  if (!n) return;

  const cfg = window.PE_CONFIG || {};
  const TOTAL = 8;
  const PASS = Number(cfg.passScore) || 80;
  const wrap = document.querySelector('.wrap');
  if (!wrap) return;

  const T = {
    step: (i, t) => `Модуль ${i} з ${t}`,
    done: 'Складено',
    open: 'Не складено',
    facts: 'У модулі',
    top: 'Нагору',
    finishDoneTitle: `Модуль ${n} складено`,
    finishOpenTitle: 'Залишився тест модуля',
    next: i => `Модуль ${i} →`,
    all: 'До всіх модулів',
    toQuiz: 'Перейти до тесту',
    hint: i => `Складіть тест на ${PASS}%, щоб відкрити модуль ${i}`,
    hintLast: `Складіть тест на ${PASS}%, щоб завершити курс`,
    doneCopy: i => `Модуль ${i} відкрито. Можна рухатися далі.`,
    openCopy: `Тест наприкінці сторінки фіксує результат і відкриває наступний модуль.`,
    openCopyLast: `Тест наприкінці сторінки фіксує результат і завершує курс.`,
    lastDone: 'Усі вісім модулів пройдено',
    lastCopy: 'Далі — фінальна атестація.',
    exam: 'До фінального іспиту →',
    examShut: 'Фінальний іспит відкриває адміністратор курсу.',
    gateTitle: 'Модуль ще закрито',
    gateCopy: i => `Спочатку складіть тест модуля ${i} на ${PASS}%.`,
    gateGo: i => `До модуля ${i} →`,
    rights: i => `© Pole Education · Judge Academy · Модуль ${i}`
  };

  /* ── progress ───────────────────────────────────────────── */
  function progress() {
    try { return JSON.parse(localStorage.getItem('pe_judge_progress_v1') || '{}'); }
    catch (_) { return {}; }
  }
  const isDone = i => Boolean((progress()[i] || {}).passed);

  /* ── hero ───────────────────────────────────────────────── */
  const hero = [...wrap.children].find(el => el.querySelector && el.querySelector('a.back'));
  let stateChip = null;
  if (hero) {
    hero.classList.add('mk-hero');
    const ey = hero.querySelector('.ey');
    /* the eyebrow ended "· MODULE 04" and the step chip beside it says
       "Модуль 4 з 8"; one of the two is noise */
    if (ey) ey.textContent = ey.textContent.replace(/\s*[·•|-]\s*MODULE\s*\d+\s*$/i, '').trim();
    const crumb = document.createElement('div');
    crumb.className = 'mk-crumb';
    if (ey) { ey.removeAttribute('style'); ey.after(crumb); crumb.appendChild(ey); }
    else hero.querySelector('a.back').after(crumb);

    const step = document.createElement('span');
    step.className = 'mk-step';
    step.textContent = T.step(n, TOTAL);
    crumb.appendChild(step);

    stateChip = document.createElement('span');
    stateChip.className = 'mk-state';
    crumb.appendChild(stateChip);

    /* the row of facts loses its button costume in CSS; here it only gets a
       label, so it reads as a caption rather than a stray row of chips */
    const facts = hero.querySelector('.meta, .pills');
    if (facts && !facts.querySelector('.mk-facts-label')) {
      const lab = document.createElement('span');
      lab.className = 'mk-facts-label';
      lab.textContent = T.facts;
      facts.prepend(lab);
    }
  }

  /* ── section tabs: the only interactive row ─────────────── */
  const nav = document.querySelector('nav.nav, nav.quicknav');
  if (nav) {
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    const targets = links
      .map(a => ({ a, el: document.getElementById(decodeURIComponent(a.hash.slice(1))) }))
      .filter(x => x.el);

    const mark = a => {
      links.forEach(l => l.classList.toggle('mk-on', l === a));
      if (a && nav.scrollWidth > nav.clientWidth) {
        const r = a.getBoundingClientRect(), b = nav.getBoundingClientRect();
        if (r.left < b.left + 8 || r.right > b.right - 8) {
          nav.scrollTo({ left: a.offsetLeft - nav.clientWidth / 2 + a.offsetWidth / 2,
                         behavior: 'smooth' });
        }
      }
    };

    /* Scroll-spy by position rather than IntersectionObserver: sections here
       are taller than the viewport, so "is it intersecting" is true for two
       of them most of the time. The one whose top last passed the tab bar is
       unambiguous. */
    let ticking = false;
    const spy = () => {
      ticking = false;
      const line = (nav.getBoundingClientRect().bottom || 0) + 24;
      let cur = targets[0];
      targets.forEach(t => { if (t.el.getBoundingClientRect().top <= line) cur = t; });
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) {
        cur = targets[targets.length - 1];
      }
      mark(cur && cur.a);
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(spy); }
    }, { passive: true });
    addEventListener('resize', spy, { passive: true });
    spy();
  }

  /* ── reading progress rail ──────────────────────────────── */
  const rail = document.createElement('div');
  rail.className = 'mk-rail';
  rail.innerHTML = '<i></i>';
  rail.setAttribute('aria-hidden', 'true');
  document.body.appendChild(rail);
  const railFill = rail.firstElementChild;

  /* ── back to top ────────────────────────────────────────── */
  const top = document.createElement('button');
  top.type = 'button';
  top.className = 'mk-top';
  top.setAttribute('aria-label', T.top);
  top.title = T.top;
  top.innerHTML = '<span aria-hidden="true">↑</span>';
  top.addEventListener('click', () => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });
  document.body.appendChild(top);

  let raf = false;
  const onScroll = () => {
    raf = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    const y = scrollY;
    railFill.style.width = (max > 0 ? Math.min(100, y / max * 100) : 0) + '%';
    top.classList.toggle('mk-show', y > 620);
  };
  addEventListener('scroll', () => {
    if (!raf) { raf = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ── end-of-module card ─────────────────────────────────── */
  /* Three modules shipped their own next-module link. The kit prints one
     card for all eight, so the old links are hidden rather than removed:
     those pages' own scripts call nextModule.classList.toggle('show') from
     inside the quiz handler, and deleting the node would throw there and
     take the whole quiz down with it. */
  document.querySelectorAll('a.unlock, #nextModule').forEach(el => el.classList.add('mk-dupe'));

  const finish = document.createElement('section');
  finish.className = 'card mk-finish';
  /* module 8 was the only one with a copyright line, and it sat after the
     card; every module gets the same line now, printed last */
  const oldFoot = wrap.querySelector(':scope > .footer');
  if (oldFoot) oldFoot.remove();
  wrap.appendChild(finish);
  const foot = document.createElement('div');
  foot.className = 'footer mk-foot';
  foot.textContent = T.rights(n);
  wrap.appendChild(foot);

  function paint() {
    const done = isDone(n);
    if (stateChip) {
      stateChip.textContent = done ? T.done : T.open;
      stateChip.dataset.state = done ? 'done' : 'open';
    }

    const quiz = document.getElementById('quiz') || document.querySelector('[id*="quiz"]');
    let title, copy, actions;

    if (!done) {
      title = T.finishOpenTitle;
      copy = n < TOTAL ? T.openCopy : T.openCopyLast;
      actions = `<a class="btn primary" href="#${quiz ? quiz.id : ''}">${T.toQuiz}</a>` +
                `<span class="mk-hint">${n < TOTAL ? T.hint(n + 1) : T.hintLast}</span>`;
    } else if (n < TOTAL) {
      title = T.finishDoneTitle;
      copy = T.doneCopy(n + 1);
      actions = `<a class="btn primary" href="module-${n + 1}.html">${T.next(n + 1)}</a>` +
                `<a class="btn secondary" href="index.html#modules">${T.all}</a>`;
    } else {
      title = T.lastDone;
      copy = T.lastCopy;
      actions = cfg.finalExamOpen
        ? `<a class="btn primary" href="${cfg.finalExamUrl || 'final-theory.html'}">${T.exam}</a>` +
          `<a class="btn secondary" href="index.html#modules">${T.all}</a>`
        : `<a class="btn primary" href="index.html#modules">${T.all}</a>` +
          `<span class="mk-hint">${T.examShut}</span>`;
    }

    finish.innerHTML =
      `<div class="mk-finish-copy"><h2>${title}</h2><p>${copy}</p></div>` +
      `<div class="mk-finish-actions">${actions}</div>`;
  }
  paint();
  addEventListener('pe-progress-updated', paint);
  addEventListener('pe-result-synced', paint);

  /* ── gate ───────────────────────────────────────────────── */
  /* A module opens only once the one before it is passed. The check waits
     for progress-sync.js to pull the remote record, or 2s, whichever comes
     first: locking someone out because a network read had not landed yet
     would be worse than showing the page a moment longer. reviewMode keeps
     the course fully open, exactly as it does on the home page. */
  if (n > 1 && !cfg.reviewMode) {
    const decide = () => {
      if (isDone(n - 1)) return;
      document.querySelectorAll('.mk-rail, .mk-top').forEach(el => el.remove());
      wrap.innerHTML =
        `<section class="card mk-gate">` +
        `<div class="mk-lock" aria-hidden="true">🔒</div>` +
        `<h1>${T.gateTitle}</h1><p>${T.gateCopy(n - 1)}</p>` +
        `<div class="mk-finish-actions">` +
        `<a class="btn primary" href="module-${n - 1}.html">${T.gateGo(n - 1)}</a>` +
        `<a class="btn secondary" href="index.html#modules">${T.all}</a>` +
        `</div></section>`;
    };
    let settled = false;
    const once = () => { if (!settled) { settled = true; decide(); } };
    addEventListener('pe-progress-updated', once, { once: true });
    setTimeout(once, 2000);
  }
})();
