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
  let signedIn = Boolean(window.PE_AUTH_STATE?.signedIn);
  let examOpen = false;
  let practicalOpen = false;
  let theoryPassed = false;
  let examAccessLoaded = false;
  let accessClient = null;
  try {
    const cfg = window.PE_CONFIG || {};
    if (window.supabase && cfg.supabaseUrl && cfg.supabasePublishableKey) {
      accessClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabasePublishableKey);
    }
  } catch (_) {}

  async function refreshExamAccess(){
    examAccessLoaded = false;
    if(!signedIn || !accessClient){ examOpen=false; practicalOpen=false; theoryPassed=false; examAccessLoaded=true; renderProgress(); return; }
    try{
      const [theoryAccess,practicalAccess,theoryResult]=await Promise.all([
        accessClient.rpc('pe_exam_access_state',{p_exam_key:'theory'}),
        accessClient.rpc('pe_exam_access_state',{p_exam_key:'practical'}),
        accessClient.rpc('pe_student_theory_result')
      ]);
      const t=Array.isArray(theoryAccess.data)?theoryAccess.data[0]:theoryAccess.data;
      const p=Array.isArray(practicalAccess.data)?practicalAccess.data[0]:practicalAccess.data;
      const tr=Array.isArray(theoryResult.data)?theoryResult.data[0]:theoryResult.data;
      examOpen=!theoryAccess.error&&Boolean(t?.is_open);
      practicalOpen=!practicalAccess.error&&Boolean(p?.is_open);
      theoryPassed=!theoryResult.error&&Boolean(tr?.result_published&&tr?.passed);
    }catch(_){
      examOpen=false;practicalOpen=false;theoryPassed=false;
    }
    examAccessLoaded=true;
    renderProgress();
  }

  function isDone(n){ return Boolean(state[n]?.passed); }
  function isUnlocked(n){ if(!signedIn) return false; const cfg = window.PE_CONFIG || {}; return Boolean(cfg.reviewMode) || n === 1 || isDone(n - 1); }
  function renderModules(){
    grid.innerHTML = modules.map(m => {
      const done = isDone(m.n), unlocked = isUnlocked(m.n);
      const status = !signedIn ? 'Потрібен вхід 🔒' : done ? 'Завершено ✓' : unlocked ? 'Доступний' : 'Заблоковано 🔒';
      const cls = done && signedIn ? 'done' : unlocked ? '' : 'locked';
      const cfg = window.PE_CONFIG || {};
      const lectureUrl = cfg.lectureCourseUrl || 'https://westudy.ua/en/PoleEducation/course/519be545-a825-4517-9f7d-a075b071b6e9';
      const action = !signedIn
        ? '<span class="module-link locked-link">Увійдіть, щоб відкрити модуль</span>'
        : unlocked
          ? `<div class="module-actions"><a class="module-link lecture-module-link" href="${lectureUrl}" target="_blank" rel="noopener">Відеолекція ↗</a><a class="module-link" href="module-${m.n}.html">Інтерактивний модуль</a></div>`
          : `<div class="module-actions"><a class="module-link lecture-module-link" href="${lectureUrl}" target="_blank" rel="noopener">Відеолекція ↗</a><span class="module-link locked-link">Спочатку складіть тест модуля ${m.n-1} на 80%</span></div>`;
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
      const pbtn=document.getElementById('practicalExamBtn'),pmsg=document.getElementById('practicalMessage');
      btn.disabled=true;btn.textContent='Іспит заблоковано';
      pbtn.disabled=true;pbtn.textContent='Іспит заблоковано';
      msg.textContent='Увійдіть у свій акаунт, щоб продовжити навчання та зберігати результати.';
      pmsg.textContent='Увійдіть у свій акаунт, щоб побачити доступ до практичної атестації.';
      return;
    }
    const done = modules.filter(m => isDone(m.n)).length;
    const percent = Math.round(done / modules.length * 100);
    document.getElementById('progressPercent').textContent = `${percent}%`;
    document.getElementById('progressText').textContent = `${done} з 8 модулів завершено`;
    document.getElementById('progressRing').style.setProperty('--p', `${percent*3.6}deg`);
    document.getElementById('routeDots').innerHTML = modules.map(m => `<i class="${isDone(m.n)?'done':''}" title="Модуль ${m.n}"></i>`).join('');
    const cfg = window.PE_CONFIG || {}, btn = document.getElementById('finalExamBtn'), msg = document.getElementById('finalMessage'), icon=document.querySelector('.final-icon');
    const eligible = done === 8 || Boolean(cfg.reviewMode);
    btn.onclick = null;
    if(!examAccessLoaded){
      btn.disabled=true;btn.textContent='Перевіряємо доступ…';
      msg.textContent='Перевіряємо, чи відкритий фінальний іспит.';
      if(icon)icon.textContent='⏳';
    } else if(examOpen && eligible && cfg.finalExamUrl){
      btn.disabled=false;btn.textContent='Розпочати фінальний іспит';
      btn.onclick=()=>location.href=cfg.finalExamUrl;
      msg.textContent=done===8
        ?'Усі модулі завершено. Фінальний іспит відкритий.'
        :'Фінальний іспит відкритий адміністратором для тестування.';
      if(icon)icon.textContent='✓';
    } else if(!examOpen){
      btn.disabled=true;btn.textContent='Іспит заблоковано';
      msg.textContent=done===8
        ?'Усі 8 модулів завершено. Очікуйте, доки адміністратор відкриє фінальний іспит.'
        :'Фінальний іспит зараз закритий адміністратором.';
      if(icon)icon.textContent='🔒';
    } else {
      btn.disabled=true;btn.textContent='Іспит заблоковано';
      msg.textContent='Спочатку завершіть усі 8 модулів.';
      if(icon)icon.textContent='🔒';
    }

    const pbtn=document.getElementById('practicalExamBtn'),pmsg=document.getElementById('practicalMessage'),picon=document.querySelector('.practical-icon');
    const practicalEligible=Boolean(cfg.reviewMode)||theoryPassed;
    pbtn.onclick=null;
    if(!examAccessLoaded){
      pbtn.disabled=true;pbtn.textContent='Перевіряємо доступ…';pmsg.textContent='Перевіряємо доступ до практичного іспиту.';if(picon)picon.textContent='⏳';
    }else if(practicalOpen&&practicalEligible&&cfg.practicalExamUrl){
      pbtn.disabled=false;pbtn.textContent='Розпочати практичний іспит';pbtn.onclick=()=>location.href=cfg.practicalExamUrl;
      pmsg.textContent=theoryPassed?'Теоретичний етап складено. Практичний іспит відкритий.':'Практичний іспит відкритий адміністратором для тестування.';
      if(picon)picon.textContent='✓';
    }else if(!practicalOpen){
      pbtn.disabled=true;pbtn.textContent='Іспит заблоковано';pmsg.textContent='Практичний іспит зараз закритий адміністратором.';if(picon)picon.textContent='🔒';
    }else{
      pbtn.disabled=true;pbtn.textContent='Іспит заблоковано';pmsg.textContent='Спочатку потрібно успішно завершити теоретичний іспит.';if(picon)picon.textContent='🔒';
    }
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
    refreshExamAccess();
  });
  window.addEventListener('pe-progress-updated', e => {
    const fresh = e.detail || JSON.parse(localStorage.getItem(key) || '{}');
    Object.keys(state).forEach(k => delete state[k]);
    Object.assign(state, fresh);
    renderModules();
    renderProgress();
  });
  renderModules();renderProgress();if(signedIn)refreshExamAccess();
})();