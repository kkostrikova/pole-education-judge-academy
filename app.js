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

  function isDone(n){ return Boolean(state[n]?.passed); }
  function renderModules(){
    grid.innerHTML = modules.map(m => `
      <article class="module-card">
        <div class="module-top"><span class="module-no">0${m.n}</span><span class="module-status ${isDone(m.n)?'done':''}">${isDone(m.n)?'Завершено ✓':'Не завершено'}</span></div>
        <h3>${m.title}</h3><p>${m.desc}</p>
        <a class="module-link" href="module-${m.n}.html">Відкрити модуль</a>
      </article>`).join('');
  }
  function renderProgress(){
    const done = modules.filter(m => isDone(m.n)).length;
    const percent = Math.round(done / modules.length * 100);
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressText').textContent = `${done} з 8 модулів завершено`;
    document.getElementById('progressRing').style.setProperty('--p', `${percent*3.6}deg`);
    document.getElementById('routeDots').innerHTML = modules.map(m => `<i class="${isDone(m.n)?'done':''}" title="Модуль ${m.n}"></i>`).join('');

    const cfg = window.PE_CONFIG || {};
    const btn = document.getElementById('finalExamBtn');
    const msg = document.getElementById('finalMessage');
    if(done === 8 && cfg.finalExamOpen && cfg.finalExamUrl){
      btn.disabled = false;
      btn.textContent = 'Розпочати фінальний іспит';
      btn.addEventListener('click', () => location.href = cfg.finalExamUrl, {once:true});
      msg.textContent = 'Усі модулі завершено. Pole Education відкрила фінальну атестацію.';
    } else if(done === 8){
      msg.textContent = 'Усі 8 модулів завершено. Очікуйте, доки Pole Education відкриє фінальний іспит.';
    }
  }
  document.querySelectorAll('.desk-card[data-go]').forEach(btn => btn.addEventListener('click', () => location.href = `module-${btn.dataset.go}.html`));
  document.getElementById('resetProgress').addEventListener('click', () => {
    if(confirm('Скинути локальний прогрес цього браузера?')){
      localStorage.removeItem(key);
      location.reload();
    }
  });
  renderModules();
  renderProgress();
})();
