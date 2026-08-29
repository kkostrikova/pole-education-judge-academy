(()=>{
const cfg=window.PE_CONFIG||{};
const DURATION_MS=(cfg.practicalDurationMinutes||30)*60*1000;
const VIDEO_FORM='https://docs.google.com/forms/d/e/1FAIpQLSdgPXDQf9QoqMAF4jsfq0GA3Py_7WG7C_O_LcBnK3RhJJCzhg/viewform?usp=sf_link';

const PERFORMANCES=[
  {id:'silks',name:'Зайцева Злата',discipline:'Повітряні полотна',category:'18+ · Еліт'},
  {id:'pole',name:'Патій Злата',discipline:'Пілон',category:'14–17 · Професіонали'},
  {id:'hoop',name:'Лучко Олеся',discipline:'Повітряне кільце',category:'7–9 · Напівпрофесіонали'}
];

const TECH=[
  ['strength','Сила',10],['flexibility','Гнучкість',5],['transitions','Оригінальні переходи та комбінації',5],
  ['stands','Стійки',5],['balances','Баланси',5],['dynamic','Динамічні комбінації',5],
  ['regrips','Перехоплення, перехвати',5],['jumps','Стрибки, сальто',5],['rotation','Динаміка круток',5],
  ['clean','Чистота виконання',5],['apparatus','Вміння володіти в повній мірі снарядом',5]
];

const ART=[
  ['emotion','Емоційна та зорова передача образу',5],['amplitude','Амплітудність та динаміка виступу',5],
  ['costume','Костюм, зачіска, макіяж',5],['originality','Оригінальність музичної композиції та ідеї',5],
  ['entrance','Вихід учасника на сцену та завершення виступу',5],['floor_choreo','Хореографічні елементи в партері',5],
  ['floor_acro','Акробатичні елементи в партері',5],['musicality','Музичність, пластика та грація',5]
];

const PENALTIES=[
  ['lines','Ненатягнуті лінії (коліна, стопи, кисті)',-0.5,'за кожний випадок','count'],
  ['angle','Недотримання ракурсу елементу',-0.5,'за кожний випадок','count'],
  ['fall','Падіння зі снаряду',-5,'за кожний випадок','count'],
  ['tangle','Заплутування в снаряді',-1,'за кожний випадок','count'],
  ['balance','Втрата рівноваги без падіння',-1,'за кожний випадок','count'],
  ['failed_entry','Невихід в елемент з 1 разу',-1,'за кожний випадок','count'],
  ['fixation','Нефіксація елементу (2 сек)',-0.2,'за кожний випадок','count'],
  ['wipe','Витирання рук об себе, снаряд або підлогу',-0.5,'за кожний випадок','count'],
  ['dirty','Брудні переходи, заходи, сходи',-0.2,'за кожний випадок','count'],
  ['grip','Пристосування хвату',-0.5,'за кожний випадок','count'],
  ['sync','Несинхронність (лише дуети)',-0.2,'за кожний випадок','count'],
  ['sounds','Лишні звуки під час виконання номеру',-0.5,'за кожний випадок','count'],
  ['timing_finish','Продовження після музики або раннє завершення',-2,'за кожний випадок','count'],
  ['erotic','Відверті елементи / позиції, еротичні рухи',-2,'за кожний випадок','count'],
  ['costume_hair','Проблеми з костюмом та зачіскою',-1,'разово','toggle'],
  ['music_language','Ненормативна лексика / музика країн-агресорів',-10,'разово','toggle'],
  ['negative','Пропаганда релігії, насильства, суїциду та негативного',-10,'разово','toggle'],
  ['exposure','Навмисне або випадкове оголення',-5,'разово','toggle'],
  ['ethics','Порушення етичних норм',-5,'разово','toggle'],
  ['general_rules','Порушення загальних правил',-1,'від -1 до -10 за рішенням судді','amount'],
  ['music_time','Невідповідність часу музики до категорії',-1,'1 секунда = -1','count'],
  ['wrong_category','Невідповідна категорія / заборонені елементи',-1,'від -1 до -10','amount']
];

const els={
  startCard:document.getElementById('startCard'),examCard:document.getElementById('examCard'),resultCard:document.getElementById('resultCard'),
  agree:document.getElementById('agreeRules'),startBtn:document.getElementById('startBtn'),startMessage:document.getElementById('startMessage'),
  timer:document.getElementById('timer'),timerValue:document.getElementById('timerValue'),performanceGrid:document.getElementById('performanceGrid'),
  mapTechnique:document.getElementById('mapTechnique'),mapArtistry:document.getElementById('mapArtistry'),mapPenalties:document.getElementById('mapPenalties'),
  mappingState:document.getElementById('mappingState'),mappingNote:document.getElementById('mappingNote'),
  techniqueTable:document.getElementById('techniqueTable'),artistryTable:document.getElementById('artistryTable'),penaltyTable:document.getElementById('penaltyTable'),
  techniqueComment:document.getElementById('techniqueComment'),artistryComment:document.getElementById('artistryComment'),penaltiesComment:document.getElementById('penaltiesComment'),
  techTotal:document.getElementById('techTotal'),artTotal:document.getElementById('artTotal'),penaltyTotal:document.getElementById('penaltyTotal'),
  techVideoLabel:document.getElementById('techVideoLabel'),artVideoLabel:document.getElementById('artVideoLabel'),penVideoLabel:document.getElementById('penVideoLabel'),
  submitBtn:document.getElementById('submitBtn'),submitHint:document.getElementById('submitHint'),saveState:document.getElementById('saveState')
};

let client,session,profile,preview=false,attemptId=null,expiresAt=0,timerId=null,saveTimer=null,finishing=false;
let mapping={technique:'',artistry:'',penalties:''};
let protocols={technique:{scores:{},comment:''},artistry:{scores:{},comment:''},penalties:{values:{},comment:''}};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const asObj=d=>Array.isArray(d)?(d[0]||{}):(d||{});
const perf=id=>PERFORMANCES.find(x=>x.id===id);
const fmt=n=>Number(n||0).toLocaleString('uk-UA',{maximumFractionDigits:1});

function renderStatic(){
  document.getElementById('videoSourceLink').href=VIDEO_FORM;
  els.performanceGrid.innerHTML=PERFORMANCES.map((p,i)=>'<article class="performance-card"><span class="performance-no">ВИСТУП 0'+(i+1)+'</span><h4>'+esc(p.name)+'</h4><p>'+esc(p.discipline)+'</p><p>'+esc(p.category)+'</p></article>').join('');
  const opts='<option value="">Оберіть виступ</option>'+PERFORMANCES.map(p=>'<option value="'+p.id+'">'+esc(p.name)+' · '+esc(p.discipline)+'</option>').join('');
  [els.mapTechnique,els.mapArtistry,els.mapPenalties].forEach(s=>s.innerHTML=opts);

  els.techniqueTable.innerHTML=TECH.map(([id,label,max])=>'<div class="score-row"><div><strong>'+esc(label)+'</strong></div><input type="number" min="0" max="'+max+'" step="0.5" data-tech="'+id+'" value="0"><span class="max">макс. '+max+'</span></div>').join('');
  els.artistryTable.innerHTML=ART.map(([id,label,max])=>'<div class="score-row"><div><strong>'+esc(label)+'</strong></div><input type="number" min="0" max="'+max+'" step="0.5" data-art="'+id+'" value="0"><span class="max">макс. '+max+'</span></div>').join('');
  els.penaltyTable.innerHTML=PENALTIES.map(([id,label,ded,note,type])=>{
    const max=type==='amount'?'10':type==='toggle'?'1':'30';
    const step=type==='amount'?'0.5':'1';
    const suffix=type==='toggle'?'0 або 1':type==='amount'?'величина штрафу':'кількість';
    return '<div class="penalty-row"><div><strong>'+esc(label)+'</strong><small>'+esc(note)+'</small></div><input type="number" min="0" max="'+max+'" step="'+step+'" data-pen="'+id+'" value="0" aria-label="'+esc(suffix)+'"><span class="deduction">'+(type==='amount'?'до -10':ded+' ×')+'</span></div>';
  }).join('');
}

function setProtocolInputs(){
  els.mapTechnique.value=mapping.technique||'';
  els.mapArtistry.value=mapping.artistry||'';
  els.mapPenalties.value=mapping.penalties||'';
  document.querySelectorAll('[data-tech]').forEach(i=>i.value=protocols.technique.scores[i.dataset.tech]??0);
  document.querySelectorAll('[data-art]').forEach(i=>i.value=protocols.artistry.scores[i.dataset.art]??0);
  document.querySelectorAll('[data-pen]').forEach(i=>i.value=protocols.penalties.values[i.dataset.pen]??0);
  els.techniqueComment.value=protocols.technique.comment||'';
  els.artistryComment.value=protocols.artistry.comment||'';
  els.penaltiesComment.value=protocols.penalties.comment||'';
  renderAll();
}

function uniqueMapping(){
  const vals=Object.values(mapping).filter(Boolean);
  return vals.length===3&&new Set(vals).size===3;
}

function renderMapping(){
  const vals=Object.values(mapping).filter(Boolean);
  const unique=new Set(vals);
  els.mappingState.textContent=unique.size+' / 3 призначено';
  els.mappingState.classList.toggle('ok',uniqueMapping());
  const duplicate=vals.length!==unique.size;
  els.mappingNote.textContent=duplicate?'Один виступ не можна використовувати у двох протоколах.':'Кожен із трьох виступів має бути використаний рівно один раз.';
  els.mappingNote.style.color=duplicate?'#8a2d3e':'';

  const labels=[
    [els.techVideoLabel,mapping.technique],[els.artVideoLabel,mapping.artistry],[els.penVideoLabel,mapping.penalties]
  ];
  labels.forEach(([el,id])=>{const p=perf(id);el.textContent=p?(p.name+' · '+p.discipline+' · '+p.category):'Спочатку оберіть виступ.'});
}

function techSum(){return TECH.reduce((s,[id,,max])=>s+Math.min(max,Math.max(0,Number(protocols.technique.scores[id]||0))),0)}
function artSum(){return ART.reduce((s,[id,,max])=>s+Math.min(max,Math.max(0,Number(protocols.artistry.scores[id]||0))),0)}
function penaltySum(){
  let total=0;
  PENALTIES.forEach(([id,,ded,,type])=>{
    const v=Math.max(0,Number(protocols.penalties.values[id]||0));
    total+=type==='amount'?-Math.min(10,v):ded*v;
  });
  return Math.round(total*10)/10;
}
function renderTotals(){
  els.techTotal.textContent=fmt(techSum())+' / 60';
  els.artTotal.textContent=fmt(artSum())+' / 40';
  els.penaltyTotal.textContent=fmt(penaltySum());
  els.submitHint.textContent=uniqueMapping()
    ?'Перевірте три електронні протоколи перед остаточним надсиланням.'
    :'Призначте кожному протоколу окремий виступ.';
}

function renderAll(){renderMapping();renderTotals()}

async function saveRemote(){
  if(preview||!attemptId||finishing)return;
  els.saveState.textContent='Зберігаємо…';
  const {error}=await client.rpc('pe_save_practical_exam_progress',{
    p_attempt_id:attemptId,p_mapping:mapping,p_protocols:protocols
  });
  els.saveState.textContent=error?'Не вдалося зберегти':'Збережено';
  els.saveState.style.color=error?'#8a2d3e':'';
}
function queueSave(){
  renderAll();
  if(preview){localStorage.setItem('pe_practical_preview',JSON.stringify({mapping,protocols}));return}
  clearTimeout(saveTimer);saveTimer=setTimeout(saveRemote,500);
}

function bindInputs(){
  els.mapTechnique.onchange=e=>{mapping.technique=e.target.value;queueSave()};
  els.mapArtistry.onchange=e=>{mapping.artistry=e.target.value;queueSave()};
  els.mapPenalties.onchange=e=>{mapping.penalties=e.target.value;queueSave()};
  document.querySelectorAll('[data-tech]').forEach(i=>i.oninput=e=>{protocols.technique.scores[e.target.dataset.tech]=Number(e.target.value||0);queueSave()});
  document.querySelectorAll('[data-art]').forEach(i=>i.oninput=e=>{protocols.artistry.scores[e.target.dataset.art]=Number(e.target.value||0);queueSave()});
  document.querySelectorAll('[data-pen]').forEach(i=>i.oninput=e=>{protocols.penalties.values[e.target.dataset.pen]=Number(e.target.value||0);queueSave()});
  els.techniqueComment.oninput=e=>{protocols.technique.comment=e.target.value;queueSave()};
  els.artistryComment.oninput=e=>{protocols.artistry.comment=e.target.value;queueSave()};
  els.penaltiesComment.oninput=e=>{protocols.penalties.comment=e.target.value;queueSave()};
  document.querySelectorAll('.protocol-tab').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.protocol-tab').forEach(x=>x.classList.toggle('active',x===b));
    document.getElementById('panelTechnique').classList.toggle('hidden',b.dataset.tab!=='technique');
    document.getElementById('panelArtistry').classList.toggle('hidden',b.dataset.tab!=='artistry');
    document.getElementById('panelPenalties').classList.toggle('hidden',b.dataset.tab!=='penalties');
  });
}

function updateTimer(){
  if(preview){els.timerValue.textContent='PREVIEW';return}
  const left=Math.max(0,expiresAt-Date.now());
  const m=Math.floor(left/60000),s=Math.floor(left%60000/1000);
  els.timerValue.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  els.timer.classList.toggle('warning',left<=10*60000);
  els.timer.classList.toggle('danger',left<=5*60000);
  if(left<=0)submitExam(true);
}

function begin(){
  els.startCard.classList.add('hidden');els.resultCard.classList.add('hidden');els.examCard.classList.remove('hidden');
  setProtocolInputs();updateTimer();
  if(timerId)clearInterval(timerId);
  if(!preview)timerId=setInterval(updateTimer,1000);
}

function hydrate(row){
  attemptId=row.id;
  expiresAt=Date.parse(row.expires_at||new Date(Date.now()+DURATION_MS).toISOString());
  mapping=row.mapping||mapping;
  protocols=row.protocols||protocols;
}

function showResult(row){
  finishing=true;if(timerId)clearInterval(timerId);clearTimeout(saveTimer);
  els.startCard.classList.add('hidden');els.examCard.classList.add('hidden');els.resultCard.classList.remove('hidden');
  document.getElementById('resultTech').textContent=fmt(row?.summary?.technique??techSum())+' / 60';
  document.getElementById('resultArt').textContent=fmt(row?.summary?.artistry??artSum())+' / 40';
  document.getElementById('resultPen').textContent=fmt(row?.summary?.penalties??penaltySum());
}

async function submitExam(timedOut=false){
  if(finishing)return;
  if(!timedOut&&!uniqueMapping()){alert('Кожен із трьох виступів має бути призначений рівно одному протоколу.');return}
  if(!timedOut&&!confirm('Надіслати практичний іспит? Після цього змінити протоколи буде неможливо.'))return;

  if(preview){showResult({summary:{technique:techSum(),artistry:artSum(),penalties:penaltySum()}});return}
  if(!attemptId)return;
  finishing=true;els.submitBtn.disabled=true;clearTimeout(saveTimer);
  const {data,error}=await client.rpc('pe_submit_practical_exam',{
    p_attempt_id:attemptId,p_mapping:mapping,p_protocols:protocols,p_timed_out:Boolean(timedOut)
  });
  if(error){finishing=false;els.submitBtn.disabled=false;alert('Не вдалося надіслати практичний іспит: '+error.message);return}
  showResult(asObj(data));
}

async function startReal(){
  els.startBtn.disabled=true;els.startMessage.classList.remove('hidden');els.startMessage.textContent='Створюємо практичну спробу…';
  const {data,error}=await client.rpc('pe_start_practical_exam');
  if(error){
    els.startMessage.className='message err';
    els.startMessage.textContent=error.message.includes('EXAM_CLOSED')?'Практичний іспит закритий адміністратором.':error.message.includes('NO_ATTEMPTS_LEFT')?'Основну спробу вже використано.':'Не вдалося розпочати іспит: '+error.message;
    return;
  }
  hydrate(asObj(data));begin();
}

async function loadState(){
  const {data,error}=await client.rpc('pe_practical_state');
  if(error){
    els.startBtn.disabled=true;els.agree.disabled=true;els.startMessage.classList.remove('hidden');els.startMessage.className='message err';els.startMessage.textContent='Серверна логіка практичного іспиту ще не активована в Supabase.';return;
  }
  const state=asObj(data);
  if(state.exists&&state.status==='in_progress'){hydrate(state);begin();return}
  if(state.exists){
    mapping=state.mapping||mapping;protocols=state.protocols||protocols;showResult(state);return;
  }
  els.startMessage.classList.remove('hidden');els.startMessage.textContent='Доступна одна основна практична спроба. Час — 30 хвилин.';
}

els.agree.onchange=()=>els.startBtn.disabled=!els.agree.checked;
els.submitBtn.onclick=()=>submitExam(false);

renderStatic();bindInputs();

(async()=>{
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  const {data:{session:s}}=await client.auth.getSession();session=s;if(!session)return;
  const {data:p}=await client.from('profiles').select('role,full_name').eq('user_id',session.user.id).single();profile=p||{};
  preview=profile.role==='admin';

  if(preview){
    try{const x=JSON.parse(localStorage.getItem('pe_practical_preview')||'{}');mapping=x.mapping||mapping;protocols=x.protocols||protocols}catch(_){}
    els.startBtn.textContent='Розпочати адміністративний preview';
    els.startMessage.classList.remove('hidden');els.startMessage.className='message ok';els.startMessage.textContent='Preview не витрачає студентську спробу.';
    els.timerValue.textContent='PREVIEW';els.startBtn.onclick=begin;return;
  }

  if(profile.role!=='student'){
    els.startBtn.disabled=true;els.agree.disabled=true;els.startMessage.classList.remove('hidden');els.startMessage.className='message err';els.startMessage.textContent='Реальна практична спроба доступна лише студентам.';return;
  }

  const {data:accessData,error:accessError}=await client.rpc('pe_exam_access_state',{p_exam_key:'practical'});
  const access=asObj(accessData);
  if(accessError||!access.is_open){
    els.startBtn.disabled=true;els.agree.disabled=true;els.startMessage.classList.remove('hidden');els.startMessage.className='message err';els.startMessage.textContent='Практичний іспит зараз закритий адміністратором.';return;
  }

  els.startBtn.onclick=startReal;
  await loadState();
})();
})();