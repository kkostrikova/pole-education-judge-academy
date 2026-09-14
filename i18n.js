/* Pole Education — UA/EN switch.
   The site renders a good part of the home page from app.js, so translating
   markup alone would miss the module cards, statuses and exam messages. This
   works on rendered text instead: exact whole-string matches only, originals
   kept so switching back is lossless, and a MutationObserver re-applies the
   pass whenever app.js re-renders. Nothing here changes app.js itself. */
(() => {
  const KEY = 'pe_lang';
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'SVG']);

  /* Exact Ukrainian source text -> English. Anything absent stays Ukrainian,
     which is how the module bodies remain untranslated for now: adding them
     is a matter of extending this table, no code changes. */
  const EN = {
    /* header + chrome */
    'Лекції': 'Lectures',
    'Модулі': 'Modules',
    'Фінальні іспити': 'Final exams',
    'Перевірити сертифікат': 'Verify certificate',
    'Увійти': 'Sign in',
    'Мій кабінет': 'My account',
    'Скинути прогрес': 'Reset progress',
    'Організаційно-суддівський курс': 'Organiser & judging course',

    /* hero */
    'Знання · Професіоналізм · Натхнення': 'Knowledge · Professionalism · Inspiration',
    'Міжнародні стандарти. Реальний досвід. Спільнота, яка розвиває.':
      'International standards. Real experience. A community that grows you.',
    'Почати навчання': 'Start learning',
    'Дізнатися більше': 'Find out more',

    /* legacy hero (hidden, kept for app.js) */
    'Організаційно-': 'Organiser and',
    'суддівський курс': 'judging course',
    'Сучасна інтерактивна система підготовки суддів та організаторів змагань з пілону й повітряних дисциплін.':
      'A modern interactive system for training judges and organisers of pole and aerial competitions.',
    'Дивитися лекції': 'Watch lectures',
    'Відкрити Judge Desk': 'Open Judge Desk',
    'навчальних модулів': 'learning modules',
    'модульних тестів': 'module tests',
    'фінальна атестація': 'final certification',
    'Ваш прогрес': 'Your progress',
    'Фінальний іспит відкривається адміністратором курсу.':
      'The final exam is opened by the course administrator.',

    /* lectures */
    'Спочатку лекція — потім практика': 'Lecture first, practice after',
    'Повний лекційний курс Pole Education розміщений на WeStudy. Переглядайте відеолекції там, а на Judge Academy проходьте інтерактивні модулі, тренажери, тести та фінальну атестацію.':
      'The full Pole Education lecture course lives on WeStudy. Watch the video lectures there, and take the interactive modules, simulators, tests and final certification here on Judge Academy.',
    'Лекція WeStudy': 'WeStudy lecture',
    'Інтерактивний модуль': 'Interactive module',
    'Тест 80%+': 'Test 80%+',
    'Відкрити лекційний курс': 'Open the lecture course',
    'Лекції відкриються в окремій вкладці ↗': 'Lectures open in a new tab ↗',
    'Відеолекція ↗': 'Video lecture ↗',
    'Увійти до курсу': 'Sign in to the course',
    'Після входу потрібно підписати NDA': 'You will need to sign the NDA after signing in',
    'Доступ до лекцій відкриється після підпису': 'Lectures unlock once the NDA is signed',

    /* curriculum */
    '8 модулів до впевненого суддівства': '8 modules to confident judging',
    'Кожен модуль завершується тестом. Після успішного проходження модуль отримує статус «Завершено».':
      'Every module ends with a test. Pass it and the module is marked “Completed”.',
    'Організація змагань': 'Competition organisation',
    'Планування, бюджет, локація, регламент, реєстрація, таймінг і робочі групи.':
      'Planning, budget, venue, regulations, registration, timing and working groups.',
    'Технічні параметри сцени та обладнання': 'Technical parameters of the stage and equipment',
    'Майданчик, покриття, пілони, повітряні знаряддя, кріплення та суддівський стіл.':
      'Floor, surface, poles, aerial apparatus, rigging and the judging table.',
    'Кодекс суддівської етики': 'Code of judging ethics',
    'Неупередженість, конфлікт інтересів, стандарти поведінки та професійна відповідальність.':
      'Impartiality, conflict of interest, standards of conduct and professional responsibility.',
    'Технічна складність': 'Technical difficulty',
    'Фізичні критерії, динамічна складність і рівень володіння знаряддям.':
      'Physical criteria, dynamic difficulty and command of the apparatus.',
    'Збавки за виконання': 'Execution deductions',
    'Штрафи за лінії, переходи, контроль тіла, повтори та інші помилки виконання.':
      'Penalties for lines, transitions, body control, repetitions and other execution errors.',
    'Артистизм та хореографія': 'Artistry and choreography',
    'Загальне враження, потік, креативність, музична інтерпретація, харизма і сцена.':
      'Overall impression, flow, creativity, musical interpretation, charisma and stage presence.',
    'Обов’язкові елементи': 'Compulsory elements',
    'Вимоги, точки фіксації, уніфікація та принципи оцінювання обов’язкових елементів.':
      'Requirements, hold points, standardisation and the principles for scoring compulsory elements.',
    'Обов’язки головного судді': 'Head judge duties',
    'Керівництво колегією, протоколи, конфлікти, скарги, апеляції та дисциплінарні рішення.':
      'Leading the panel, protocols, conflicts, complaints, appeals and disciplinary decisions.',

    /* module card states */
    'Потрібен вхід 🔒': 'Sign-in required 🔒',
    'Потрібен NDA 🔒': 'NDA required 🔒',
    'Потрібен NDA': 'NDA required',
    'Завершено ✓': 'Completed ✓',
    'Доступний': 'Available',
    'Заблоковано 🔒': 'Locked 🔒',
    'Увійдіть, щоб відкрити модуль': 'Sign in to open the module',
    'Підписати договір NDA': 'Sign the NDA',
    'Увійдіть, щоб побачити свій прогрес': 'Sign in to see your progress',
    'Увійдіть у свій акаунт, щоб продовжити навчання та зберігати результати.':
      'Sign in to your account to continue learning and save your results.',
    'Увійдіть у свій акаунт, щоб побачити доступ до практичної атестації.':
      'Sign in to your account to see access to the practical certification.',
    'Увійдіть, щоб побачити статус завершення курсу.':
      'Sign in to see your course completion status.',
    'Підпишіть договір NDA перед початком навчання': 'Sign the NDA before you start',
    'Перед доступом до курсу підпишіть договір про нерозповсюдження інформації.':
      'Sign the non-disclosure agreement before accessing the course.',
    'Перед початком навчання': 'Before you begin',
    'Підпишіть NDA власноручним підписом на екрані — після цього модулі, лекції та іспити відкриються.':
      'Sign the NDA by hand on screen — modules, lectures and exams unlock straight after.',

    /* judge desk */
    'Робочий центр судді: ключові теми, швидкі переходи та майбутні тренажери.':
      'The judge’s workspace: key topics, quick links and upcoming simulators.',
    'Сила, гнучкість, динаміка, володіння знаряддям': 'Strength, flexibility, dynamics, command of the apparatus',
    'Збавки та штрафи': 'Deductions and penalties',
    'Лінії, переходи, контроль, помилки виконання': 'Lines, transitions, control, execution errors',
    'Артистизм': 'Artistry',
    'Потік, хореографія, музика, харизма, сцена': 'Flow, choreography, music, charisma, stage',
    'Критерії, фіксації, уніфікація оцінювання': 'Criteria, holds, standardised scoring',
    'Протоколи, конфлікти, апеляції, рішення': 'Protocols, conflicts, appeals, decisions',
    'Ситуаційні тренажери': 'Situational simulators',
    '10 реалістичних кейсів: рішення судді, Head Judge, безпека, етика та протоколи':
      '10 realistic cases: judge decisions, head judge, safety, ethics and protocols',

    /* exams */
    'Теоретичний іспит': 'Theory exam',
    'Завершіть усі 8 модулів. Навіть після цього іспит залишатиметься закритим, доки Pole Education не відкриє атестацію.':
      'Complete all 8 modules. Even then the exam stays closed until Pole Education opens certification.',
    'Іспит заблоковано': 'Exam locked',
    'Практичний іспит': 'Practical exam',
    'Практична частина відкривається адміністратором після теоретичного етапу.':
      'The practical part is opened by the administrator after the theory stage.',
    'Перевіряємо доступ…': 'Checking access…',
    'Перевіряємо, чи відкритий фінальний іспит.': 'Checking whether the final exam is open.',
    'Розпочати фінальний іспит': 'Start the final exam',
    'Усі модулі завершено. Фінальний іспит відкритий.': 'All modules complete. The final exam is open.',
    'Фінальний іспит відкритий адміністратором для тестування.':
      'The final exam has been opened by the administrator for testing.',
    'Усі 8 модулів завершено. Очікуйте, доки адміністратор відкриє фінальний іспит.':
      'All 8 modules complete. Wait for the administrator to open the final exam.',
    'Фінальний іспит зараз закритий адміністратором.': 'The final exam is currently closed by the administrator.',
    'Спочатку завершіть усі 8 модулів.': 'Complete all 8 modules first.',
    'Перевіряємо доступ до практичного іспиту.': 'Checking access to the practical exam.',
    'Розпочати практичний іспит': 'Start the practical exam',
    'Теоретичний етап складено. Практичний іспит відкритий.': 'Theory stage passed. The practical exam is open.',
    'Практичний іспит відкритий адміністратором для тестування.':
      'The practical exam has been opened by the administrator for testing.',
    'Практичний іспит зараз закритий адміністратором.': 'The practical exam is currently closed by the administrator.',
    'Спочатку потрібно успішно завершити теоретичний іспит.': 'You must pass the theory exam first.',

    /* completion */
    '8 модулів': '8 modules',
    'Теорія': 'Theory',
    'Складено': 'Passed',
    'Очікується': 'Pending',
    'Практика': 'Practical',
    'Курс завершено': 'Course complete',
    'Фінальна сертифікація': 'Final certification',
    'Вітаємо! Усі навчальні модулі та обидві частини фінальної атестації успішно завершені. Ви виконали всі вимоги курсу Pole Education Judge Academy.':
      'Congratulations! Every learning module and both parts of the final certification are complete. You have met all requirements of the Pole Education Judge Academy course.',
    'Для завершення курсу потрібно пройти всі 8 модулів, скласти теоретичний і практичний іспити.':
      'To complete the course you need to finish all 8 modules and pass both the theory and practical exams.',
    'Скинути локальний прогрес цього браузера?': 'Reset this browser’s local progress?'
  };

  /* Patterns for text that carries numbers, so it cannot be matched whole. */
  const PATTERNS = [
    [/^(\d+) з 8 модулів завершено$/, (m) => `${m[1]} of 8 modules completed`],
    [/^Спочатку складіть тест модуля (\d+) на 80%$/, (m) => `Pass the module ${m[1]} test at 80% first`],
    [/^Модуль (\d+) заблоковано\. Спочатку складіть тест модуля (\d+) щонайменше на 80%\.$/,
      (m) => `Module ${m[1]} is locked. Pass the module ${m[2]} test at 80% or better first.`],
    [/^Модуль (\d+)$/, (m) => `Module ${m[1]}`]
  ];

  function translate(str) {
    const t = str.trim();
    if (!t) return null;
    if (EN[t]) return str.replace(t, EN[t]);
    for (const [re, fn] of PATTERNS) {
      const m = t.match(re);
      if (m) return str.replace(t, fn(m));
    }
    return null;
  }

  const originals = new WeakMap();   // node -> its Ukrainian text
  const attrOriginals = new WeakMap(); // el -> {attr: ua}
  const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
  let lang = 'uk';
  let observer = null;

  function walk(root, toEnglish) {
    const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        const el = n.nodeType === 1 ? n : n.parentElement;
        if (el && (SKIP.has(el.tagName) || el.closest('[data-i18n-skip]'))) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = it.nextNode())) {
      if (n.nodeType === 3) {
        if (toEnglish) {
          const out = translate(n.nodeValue);
          if (out !== null) { if (!originals.has(n)) originals.set(n, n.nodeValue); n.nodeValue = out; }
        } else if (originals.has(n)) {
          n.nodeValue = originals.get(n); originals.delete(n);
        }
      } else {
        for (const a of ATTRS) {
          if (!n.hasAttribute || !n.hasAttribute(a)) continue;
          if (toEnglish) {
            const out = translate(n.getAttribute(a));
            if (out !== null) {
              const store = attrOriginals.get(n) || {};
              if (!(a in store)) { store[a] = n.getAttribute(a); attrOriginals.set(n, store); }
              n.setAttribute(a, out);
            }
          } else {
            const store = attrOriginals.get(n);
            if (store && a in store) { n.setAttribute(a, store[a]); delete store[a]; }
          }
        }
      }
    }
  }

  function apply(next) {
    lang = next === 'en' ? 'en' : 'uk';
    document.documentElement.lang = lang === 'en' ? 'en' : 'uk';
    if (observer) observer.disconnect();
    walk(document.body, lang === 'en');
    paintSwitch();
    if (lang === 'en' && observer) observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    try { localStorage.setItem(KEY, lang); } catch (_) {}
  }

  /* app.js re-renders the module grid and exam panels; re-translate what it adds */
  function startObserver() {
    let queued = false;
    observer = new MutationObserver(() => {
      if (lang !== 'en' || queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        observer.disconnect();
        walk(document.body, true);
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      });
    });
  }

  let box = null;
  function paintSwitch() {
    if (!box) return;
    box.querySelectorAll('button').forEach(b => {
      const on = b.dataset.lang === lang;
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('is-on', on);
    });
  }

  function mount() {
    const bar = document.querySelector('.topbar');
    if (!bar || document.querySelector('.pe-lang')) return false;
    box = document.createElement('div');
    box.className = 'pe-lang';
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Language / Мова');
    box.dataset.i18nSkip = '';
    box.innerHTML =
      '<button type="button" data-lang="uk">UA</button>' +
      '<span aria-hidden="true">|</span>' +
      '<button type="button" data-lang="en">EN</button>';
    box.addEventListener('click', e => {
      const b = e.target.closest('button[data-lang]');
      if (b) apply(b.dataset.lang);
    });
    bar.appendChild(box);
    return true;
  }

  function boot() {
    /* Only pages that carry the switch are translated. Elsewhere this does
       nothing at all — in particular it must not stamp lang="en" on a page
       whose text is still Ukrainian, which would lie to screen readers and
       search engines. */
    if (!mount()) return;
    startObserver();
    let saved = 'uk';
    try { saved = localStorage.getItem(KEY) || 'uk'; } catch (_) {}
    apply(saved);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
