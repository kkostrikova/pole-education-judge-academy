(() => {
  const modules = [
    {n:1,title:'Організація змагань',desc:'Планування, бюджет, локація, регламент, реєстрація, таймінг і робочі групи.'},
    {n:2,title:'Технічні параметри сцени та обладнання',desc:'Майданчик, покриття, пілони, повітряні знаряддя, кріплення та суддівський стіл.'},
    {n:3,title:'Кодекс суддівської етики',desc:'Неупередженість, конфлікт інтересів, стандарти поведінки та професійна відповідальність.'},
    {n:4,title:'Технічна складність',desc:'Фізичні критерії, динамічна складність і рівень володіння знаряддям.'},
    {n:5,title:'Збавки за виконання',desc:'Штрафи за лінії, переходи, контроль тіла, повтори та інші помилки виконання.'},
    {n:6,title:'Артистизм та хореографія',desc:'Загальне враження, потік, креативність, музична інтерпретація, харизма і сцена.'},
    {n:7,title:'Обов’язкові елементи',desc:'Вимоги, точки фіксації, уніфікація та принципи оцінювання обов’язкових елементів.'},
    {n:8,title:'Обов’язки головного судді',desc:'Керівництво колегією, протоколи, конфлікти, скарги, апеляції та дисциплінарні рішення.'}
  ];
  const key = 'pe_judge_progress_v1';
  const state = JSON.parse(localStorage.getItem(key) || '{}');
  const grid = document.getElementById('moduleGrid');
  let signedIn = false;

  function isDone(n){ return Boolean(state[n]?.passed); }
  function isUnlocked(n){ if(!signedIn) return false; const cfg = window.PE_CONFIG || {}; return Boolean(cfg.reviewMode) || n === 1 || isDone(n - 1); }
  function renderModules(){
    grid.innerHTML = modules.map(m => {
      const done = isDone(m.n), unlocked = isUnlocked(m.n);
      const status = !signedIn ? 'Потрібен вхід 🔒' : done ? 'Завершено ✓' : unlocked ? 'Доступний' : 'Заблоковано 🔒';
      const cls = done && signedIn ? 'done' : unlocked ? '' : 'locked';
      const action = !signedIn
        ? '<span class="module-link locked-link">Увійдіть, щоб відкрити модуль</span>'
        : unlocked
          ? `<a class="module-link" href="module-${m.n}.html">Відкрити модуль</a>`
          : `<span class="module-link locked-link">Спочатку складіть тест модуля ${m.n-1} на 80%</span>`;
      return `<article class="module-card ${unlocked?'':'locked'}">
        <div class="module-top"><span class="module-no">0${m.n}</span><span class="module-status ${cls}">${status}</span></div>
        <h3>${m.title}</h3><p>${m.desc}</p>${action}
      </article>`;
    }).join('');
  }
  function renderProgress(){
    if(!signedIn){
      document.getElementById('progressPercent').textContent = '—';
      document.getElementById('progressText').textContent = 'Увійдіть, щоб побачити свій прогрес';
      document.getElementById('progressRing').style.setProperty('--p','0deg');
      document.getElementById('routeDots').innerHTML = modules.map(()=>'<i></i>').join('');
      const btn=document.getElementById('finalExamBtn'),msg=document.getElementById('finalMessage');
      btn.disabled=true;btn.textContent='Іспит заблоковано';
      msg.textContent='Увійдіть у свій акаунт, щоб продовжити навчання та зберігати результати.';
      return;
    }
    const done = modules.filter(m => isDone(m.n)).length;
    const percent = Math.round(done / modules.length * 100);
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressText').textContent = `${done} з 8 модулів завершено`;
    document.getElementById('progressRing').style.setProperty('--p', `${percent*3.6}deg`);
    document.getElementById('routeDots').innerHTML = modules.map(m => `<i class="${isDone(m.n)?'done':''}" title="Модуль ${m.n}"></i>`).join('');
    const cfg = window.PE_CONFIG || {}, btn = document.getElementById('finalExamBtn'), msg = document.getElementById('finalMessage');
    if(done === 8 && cfg.finalExamOpen && cfg.finalExamUrl){btn.disabled=false;btn.textContent='Розпочати фінальний іспит';btn.addEventListener('click',()=>location.href=cfg.finalExamUrl,{once:true});msg.textContent='Усі модулі завершено. Pole Education відкрила фінальну атестацію.'}
    else if(done === 8) msg.textContent='Усі 8 модулів завершено. Очікуйте, доки Pole Education відкриє фінальний іспит.';
  }
  document.querySelectorAll('.desk-card[data-go]').forEach(btn => btn.addEventListener('click', () => {
    const n=Number(btn.dataset.go);
    if(!signedIn){ location.href='auth.html'; return; }
    if(isUnlocked(n)) location.href=`module-${n}.html`;
    else alert(`Модуль ${n} заблоковано. Спочатку складіть тест модуля ${n-1} щонайменше на 80%.`);
  }));
  document.getElementById('resetProgress').addEventListener('click',()=>{if(confirm('Скинути локальний прогрес цього браузера?')){localStorage.removeItem(key);location.reload()}});
  window.addEventListener('pe-auth-ready', e => {
    signedIn = Boolean(e.detail?.signedIn);
    renderModules();
    renderProgress();
  });
  window.addEventListener('pe-progress-updated', e => {
    const fresh = e.detail || JSON.parse(localStorage.getItem(key) || '{}');
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, fresh);
    renderModules();
    renderProgress();
  });
  renderModules();renderProgress();
})();