(()=>{
const cfg=window.PE_CONFIG||{};
const DURATION_MS=(cfg.practicalDurationMinutes||30)*60*1000;

const PERFORMANCES=[
  {id:'silks',name:'Зайцева Злата',discipline:'Повітряні полотна',category:'18+ · Еліт',youtube:'ZuPyocdi5Wk'},
  {id:'pole',name:'Патій Злата',discipline:'Пілон',category:'14–17 · Професіонали',youtube:'PnuPJB1xDt4'},
  {id:'hoop',name:'Лучко Олеся',discipline:'Повітряне кільце',category:'7–9 · Напівпрофесіонали',youtube:'IcdLNwSfLMk'}
];

const TECHNIQUE_PROTOCOLS={
  pole:{label:'pole sport',dynamic:[
    ['rotation','Обертання 360 та 720 та комбінації'],['dynamic','Динамічні елементи та їх комбінації'],
    ['jumps','Стрибки на пілон та з пілону'],['contact_salto','Контактні сальто'],['salto','Сальто'],
    ['wheels','Колеса та перевороти на пілоні та з пілоном'],['switch','Switch'],['drops','Зриви'],['cascades','Каскади'],['regrips','Перехвати']
  ],general:[
    ['strength','Сила'],['flexibility','Гнучкість'],['coordination','Спритність та координація'],
    ['stands','Стійки та баланси'],['fixation','Фіксація елементів'],['entries','Виходи на пілон'],['mastery','Рівень володіння пілоном']
  ]},
  hoop:{label:'Aerial hoop',dynamic:[
    ['rotation','Обертання та їх комбінації'],['rolls','Роли'],['regrip_body','Перехват зі зміною положення тіла та/або кінцівок'],
    ['jumps','Стрибки на кільце та з кільця'],['salto_turns','Сальто та перевороти'],['dynamic_combo','Комбінації динамічних елементів'],['other_dynamic','Інші динамічні елементи']
  ],general:[
    ['strength','Сила'],['flexibility','Гнучкість'],['coordination','Спритність та координація'],
    ['stands','Стійки та баланси'],['fixation','Фіксація елементів'],['entries','Виходи на кільце'],['mastery','Рівень володіння кільцем']
  ]},
  silks:{label:'Aerial silk',dynamic:[
    ['regrips','Перехвати'],['regrip_body','Перехват зі зміною положення тіла відносно полотна'],['drops','Зриви'],['salto','Сальто'],
    ['cascade_unwraps','Каскадні розмоти'],['dynamic_combo','Комбінації динамічних елементів'],['turns_wheels','Перевороти та колеса'],
    ['wraps','Намоти'],['rotation','Обертання та їх комбінації']
  ],general:[
    ['strength','Сила'],['flexibility','Гнучкість'],['coordination','Спритність та координація'],
    ['stands','Стійки та баланси'],['fixation','Фіксація елементів'],['entries','Виходи на полотно'],['mastery','Рівень володіння полотном']
  ]}
};

const ART=[
  ['overall','Загальне враження від усієї постановки'],['flow','Потік, легкість та віртуозність переходів між рухами'],
  ['creative','Креативні переходи на предметі і в партері'],['originality','Оригінальність та збалансованість хореографічної постановки'],
  ['music','Інтерпретація музики тілом, заповнення музичних акцентів'],['charisma','Харизма, володіння сценою, впевненість'],
  ['eye','Зоровий контакт з глядачем, міміка, виразність та емоційність'],['harmony','Гармонійність усієї постановки'],
  ['balance','Баланс трюків на предметі'],['acro','Складність акробатичних рухів'],['stage','Використання сцени'],['costume','Костюм та сценічний образ']
];
const ART_REDUCTIONS=[
  ['start_end','Відсутність логічного початку чи кінця',-3],
  ['costume_image','Невідповідність костюма образу',-3],
  ['rig_touch','Торкання системи тросів та кріплення знаряддя під час виступу',-3]
];

const PENALTIES=[
  ['lines','Неправильні лінії',-0.2,'count'],
  ['transitions','Погане виконання переходів',-0.5,'count'],
  ['angle','Неправильний кут руху',-0.5,'count'],
  ['slip','Зісковзування',-0.5,'count'],
  ['balance','Втрата балансу',-1,'count'],
  ['tangle','Заплутування (тільки полотно)',-1,'count'],
  ['apparatus_loss','Втрата предмету (тільки кільце)',-1,'count'],
  ['wipe','Витирання рук, поправляння костюма, зачіски, підспівування',-1,'count'],
  ['fall','Падіння',-5,'count'],
  ['erotic','Відверті чи еротичні рухи та позиції',-5,'count']
];
const PENALTY_ONCE=[
  ['repeat','Надмірна повторюваність рухів',-2],
  ['apparatus_use','Нерівноцінне використання обох пілонів та незаповнення висоти',-2],
  ['costume','Проблеми з костюмом та зачіскою',-5]
];

const els={
  startCard:document.getElementById('startCard'),examCard:document.getElementById('examCard'),resultCard:document.getElementById('resultCard'),
  agree:document.getElementById('agreeRules'),startBtn:document.getElementById('startBtn'),startMessage:document.getElementById('startMessage'),
  timer:document.getElementById('timer'),timerValue:document.getElementById('timerValue'),performanceGrid:document.getElementById('performanceGrid'),
  mapTechnique:document.getElementById('mapTechnique'),mapArtistry:document.getElementById('mapArtistry'),mapPenalties:document.getElementById('mapPenalties'),
  mappingState:document.getElementById('mappingState'),mappingNote:document.getElementById('mappingNote'),
  techniqueTable:document.getElementById('techniqueTable'),artistryTable:document.getElementById('artistryTable'),penaltyTable:document.getElementById('penaltyTable'),
  techTotal:document.getElementById('techTotal'),artTotal:document.getElementById('artTotal'),penaltyTotal:document.getElementById('penaltyTotal'),
  techVideoLabel:document.getElementById('techVideoLabel'),artVideoLabel:document.getElementById('artVideoLabel'),penVideoLabel:document.getElementById('penVideoLabel'),
  techProtocolTitle:document.getElementById('techProtocolTitle'),submitBtn:document.getElementById('submitBtn'),submitHint:document.getElementById('submitHint'),saveState:document.getElementById('saveState')
};

let client,session,profile,preview=false,attemptId=null,expiresAt=0,timerId=null,saveTimer=null,finishing=false;
let mapping={technique:'',artistry:'',penalties:''};
let protocols={
  technique:{byApparatus:{}},
  artistry:{scores:{},comments:{},reductions:{},reductionComments:{}},
  penalties:{counts:{},comments:{},once:{},onceComments:{}}
};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const asObj=d=>Array.isArray(d)?(d[0]||{}):(d||{});
const perf=id=>PERFORMANCES.find(x=>x.id===id);
const fmt=n=>Number(n||0).toLocaleString('uk-UA',{maximumFractionDigits:1});
const scoreVal=v=>Math.max(0,Math.min(5,Number(v||0)));

function ensureShape(){
  protocols.technique??={byApparatus:{}};protocols.technique.byApparatus??={};
  ['pole','hoop','silks'].forEach(k=>{protocols.technique.byApparatus[k]??={scores:{},comments:{}};protocols.technique.byApparatus[k].scores??={};protocols.technique.byApparatus[k].comments??={}});
  protocols.artistry??={};protocols.artistry.scores??={};protocols.artistry.comments??={};protocols.artistry.reductions??={};protocols.artistry.reductionComments??={};
  protocols.penalties??={};protocols.penalties.counts??={};protocols.penalties.comments??={};protocols.penalties.once??={};protocols.penalties.onceComments??={};
}

function renderVideos(){
  els.performanceGrid.innerHTML=PERFORMANCES.map((p,i)=>'<article class="performance-card"><div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/'+p.youtube+'?rel=0" title="'+esc(p.name)+'" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><div class="performance-copy"><span class="performance-no">ВИСТУП 0'+(i+1)+'</span><h4>'+esc(p.name)+'</h4><p>'+esc(p.discipline)+'</p><p>'+esc(p.category)+'</p></div></article>').join('');
}

function renderSelectors(){
  const opts='<option value="">Оберіть виступ</option>'+PERFORMANCES.map(p=>'<option value="'+p.id+'">'+esc(p.name)+' · '+esc(p.discipline)+'</option>').join('');
  [els.mapTechnique,els.mapArtistry,els.mapPenalties].forEach(s=>s.innerHTML=opts);
}

function rowHead(maxLabel='Максимальний бал',evalLabel='Оцінка'){
  return '<div class="proto-head-row"><span>Критерій оцінки</span><span>'+maxLabel+'</span><span>'+evalLabel+'</span><span>Коментар</span></div>';
}
function scoreRow(id,label,value,comment,kind){
  return '<div class="proto-row"><strong>'+esc(label)+'</strong><span class="max">5</span><input type="number" min="0" max="5" step="0.5" value="'+esc(value??0)+'" data-'+kind+'-score="'+id+'"><textarea data-'+kind+'-comment="'+id+'" placeholder="Коментар">'+esc(comment||'')+'</textarea></div>';
}

function renderTechnique(){
  ensureShape();
  const apparatus=mapping.technique;
  const proto=TECHNIQUE_PROTOCOLS[apparatus];
  if(!proto){
    els.techProtocolTitle.textContent='Протокол оцінки технічної складності';
    els.techniqueTable.innerHTML='<div class="message">Оберіть виступ для технічної складності — після цього відкриється точний протокол відповідного снаряда.</div>';
    els.techTotal.textContent='0';
    return;
  }
  els.techProtocolTitle.textContent='Протокол оцінки технічної складності '+proto.label;
  const store=protocols.technique.byApparatus[apparatus];
  let html='<div class="proto-section">Динамічна складність</div>'+rowHead();
  html+=proto.dynamic.map(([id,label])=>scoreRow(id,label,store.scores[id],store.comments[id],'tech')).join('');
  html+='<div class="proto-section">Загальні фізичні критерії</div>'+rowHead();
  html+=proto.general.map(([id,label])=>scoreRow(id,label,store.scores[id],store.comments[id],'tech')).join('');
  els.techniqueTable.innerHTML=html;
  bindDynamicInputs();
  renderTotals();
}

function renderArtistry(){
  ensureShape();
  let html=rowHead();
  html+=ART.map(([id,label])=>scoreRow(id,label,protocols.artistry.scores[id],protocols.artistry.comments[id],'art')).join('');
  html+='<div class="proto-section">Загальне зниження балів · одноразово</div>';
  html+='<div class="proto-head-row"><span>Критерій</span><span>Зниження</span><span>Застосувати</span><span>Коментар</span></div>';
  html+=ART_REDUCTIONS.map(([id,label,ded])=>'<div class="proto-row"><strong>'+esc(label)+'</strong><span class="deduct">'+ded+'</span><input type="checkbox" '+(protocols.artistry.reductions[id]?'checked':'')+' data-art-reduction="'+id+'"><textarea data-art-reduction-comment="'+id+'" placeholder="Коментар">'+esc(protocols.artistry.reductionComments[id]||'')+'</textarea></div>').join('');
  els.artistryTable.innerHTML=html;
  bindDynamicInputs();renderTotals();
}

function renderPenalties(){
  ensureShape();
  let html='<div class="proto-section">Збавки за кожен випадок</div><div class="proto-head-row"><span>Критерій оцінки</span><span>Балів за кожен раз</span><span>Кількість</span><span>Коментар</span></div>';
  html+=PENALTIES.map(([id,label,ded])=>'<div class="proto-row"><strong>'+esc(label)+'</strong><span class="deduct">'+ded+'</span><input type="number" min="0" max="50" step="1" value="'+esc(protocols.penalties.counts[id]??0)+'" data-pen-count="'+id+'"><textarea data-pen-comment="'+id+'" placeholder="Коментар">'+esc(protocols.penalties.comments[id]||'')+'</textarea></div>').join('');
  html+='<div class="proto-section">Загальне зниження балів · одноразово</div><div class="proto-head-row"><span>Критерій</span><span>Зниження</span><span>Застосувати</span><span>Коментар</span></div>';
  html+=PENALTY_ONCE.map(([id,label,ded])=>'<div class="proto-row"><strong>'+esc(label)+'</strong><span class="deduct">'+ded+'</span><input type="checkbox" '+(protocols.penalties.once[id]?'checked':'')+' data-pen-once="'+id+'"><textarea data-pen-once-comment="'+id+'" placeholder="Коментар">'+esc(protocols.penalties.onceComments[id]||'')+'</textarea></div>').join('');
  els.penaltyTable.innerHTML=html;
  bindDynamicInputs();renderTotals();
}

function uniqueMapping(){const vals=Object.values(mapping).filter(Boolean);return vals.length===3&&new Set(vals).size===3}

function renderMapping(){
  els.mapTechnique.value=mapping.technique||'';els.mapArtistry.value=mapping.artistry||'';els.mapPenalties.value=mapping.penalties||'';
  const vals=Object.values(mapping).filter(Boolean),unique=new Set(vals),duplicate=vals.length!==unique.size;
  els.mappingState.textContent=unique.size+' / 3 призначено';els.mappingState.classList.toggle('ok',uniqueMapping());
  els.mappingNote.textContent=duplicate?'Один виступ не можна використовувати у двох протоколах.':'Кожен із трьох виступів має бути використаний рівно один раз.';
  els.mappingNote.style.color=duplicate?'#8a2d3e':'';
  [[els.techVideoLabel,mapping.technique],[els.artVideoLabel,mapping.artistry],[els.penVideoLabel,mapping.penalties]].forEach(([el,id])=>{const p=perf(id);el.textContent=p?(p.name+' · '+p.discipline+' · '+p.category):'Спочатку оберіть виступ.'});
}

function techSum(){
  const a=mapping.technique;if(!a||!TECHNIQUE_PROTOCOLS[a])return 0;
  const p=TECHNIQUE_PROTOCOLS[a],s=protocols.technique.byApparatus[a]?.scores||{};
  return [...p.dynamic,...p.general].reduce((t,[id])=>t+scoreVal(s[id]),0);
}
function techMax(){const p=TECHNIQUE_PROTOCOLS[mapping.technique];return p?([...p.dynamic,...p.general].length*5):0}
function artSum(){
  const raw=ART.reduce((t,[id])=>t+scoreVal(protocols.artistry.scores[id]),0);
  const ded=ART_REDUCTIONS.reduce((t,[id,,d])=>t+(protocols.artistry.reductions[id]?d:0),0);
  return Math.max(0,raw+ded);
}
function penaltySum(){
  let total=PENALTIES.reduce((t,[id,,d])=>t+d*Math.max(0,Number(protocols.penalties.counts[id]||0)),0);
  total+=PENALTY_ONCE.reduce((t,[id,,d])=>t+(protocols.penalties.once[id]?d:0),0);
  return Math.round(total*10)/10;
}
function renderTotals(){
  const tm=techMax();els.techTotal.textContent=fmt(techSum())+(tm?' / '+tm:'');
  els.artTotal.textContent=fmt(artSum())+' / 60';els.penaltyTotal.textContent=fmt(penaltySum());
  els.submitHint.textContent=uniqueMapping()?'Перевірте три заповнені протоколи перед остаточним надсиланням.':'Призначте кожному протоколу окремий виступ.';
}

function bindDynamicInputs(){
  document.querySelectorAll('[data-tech-score]').forEach(i=>i.oninput=e=>{const a=mapping.technique;if(!a)return;protocols.technique.byApparatus[a].scores[e.target.dataset.techScore]=Number(e.target.value||0);queueSave()});
  document.querySelectorAll('[data-tech-comment]').forEach(i=>i.oninput=e=>{const a=mapping.technique;if(!a)return;protocols.technique.byApparatus[a].comments[e.target.dataset.techComment]=e.target.value;queueSave()});
  document.querySelectorAll('[data-art-score]').forEach(i=>i.oninput=e=>{protocols.artistry.scores[e.target.dataset.artScore]=Number(e.target.value||0);queueSave()});
  document.querySelectorAll('[data-art-comment]').forEach(i=>i.oninput=e=>{protocols.artistry.comments[e.target.dataset.artComment]=e.target.value;queueSave()});
  document.querySelectorAll('[data-art-reduction]').forEach(i=>i.onchange=e=>{protocols.artistry.reductions[e.target.dataset.artReduction]=e.target.checked;queueSave()});
  document.querySelectorAll('[data-art-reduction-comment]').forEach(i=>i.oninput=e=>{protocols.artistry.reductionComments[e.target.dataset.artReductionComment]=e.target.value;queueSave()});
  document.querySelectorAll('[data-pen-count]').forEach(i=>i.oninput=e=>{protocols.penalties.counts[e.target.dataset.penCount]=Number(e.target.value||0);queueSave()});
  document.querySelectorAll('[data-pen-comment]').forEach(i=>i.oninput=e=>{protocols.penalties.comments[e.target.dataset.penComment]=e.target.value;queueSave()});
  document.querySelectorAll('[data-pen-once]').forEach(i=>i.onchange=e=>{protocols.penalties.once[e.target.dataset.penOnce]=e.target.checked;queueSave()});
  document.querySelectorAll('[data-pen-once-comment]').forEach(i=>i.oninput=e=>{protocols.penalties.onceComments[e.target.dataset.penOnceComment]=e.target.value;queueSave()});
}

function renderAll(){ensureShape();renderMapping();renderTechnique();renderArtistry();renderPenalties();renderTotals()}

async function saveRemote(){
  if(preview||!attemptId||finishing)return;
  els.saveState.textContent='Зберігаємо…';
  const {error}=await client.rpc('pe_save_practical_exam_progress',{p_attempt_id:attemptId,p_mapping:mapping,p_protocols:protocols});
  els.saveState.textContent=error?'Не вдалося зберегти':'Збережено';els.saveState.style.color=error?'#8a2d3e':'';
}
function queueSave(){renderMapping();renderTotals();if(preview){localStorage.setItem('pe_practical_preview',JSON.stringify({mapping,protocols}));return}clearTimeout(saveTimer);saveTimer=setTimeout(saveRemote,450)}

function bindStatic(){
  els.mapTechnique.onchange=e=>{mapping.technique=e.target.value;renderTechnique();queueSave()};
  els.mapArtistry.onchange=e=>{mapping.artistry=e.target.value;queueSave()};
  els.mapPenalties.onchange=e=>{mapping.penalties=e.target.value;queueSave()};
  document.querySelectorAll('.protocol-tab').forEach(b=>b.onclick=()=>{
    document.querySelectorAll('.protocol-tab').forEach(x=>x.classList.toggle('active',x===b));
    document.getElementById('panelTechnique').classList.toggle('hidden',b.dataset.tab!=='technique');
    document.getElementById('panelArtistry').classList.toggle('hidden',b.dataset.tab!=='artistry');
    document.getElementById('panelPenalties').classList.toggle('hidden',b.dataset.tab!=='penalties');
  });
}

function updateTimer(){
  if(preview){els.timerValue.textContent='PREVIEW';return}
  const left=Math.max(0,expiresAt-Date.now()),m=Math.floor(left/60000),s=Math.floor(left%60000/1000);
  els.timerValue.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');els.timer.classList.toggle('warning',left<=10*60000);els.timer.classList.toggle('danger',left<=5*60000);
  if(left<=0)submitExam(true);
}
function begin(){els.startCard.classList.add('hidden');els.resultCard.classList.add('hidden');els.examCard.classList.remove('hidden');renderAll();updateTimer();if(timerId)clearInterval(timerId);if(!preview)timerId=setInterval(updateTimer,1000)}
function hydrate(row){attemptId=row.id;expiresAt=Date.parse(row.expires_at||new Date(Date.now()+DURATION_MS).toISOString());mapping=row.mapping||mapping;protocols=row.protocols||protocols;ensureShape()}
function showResult(){finishing=true;if(timerId)clearInterval(timerId);clearTimeout(saveTimer);els.startCard.classList.add('hidden');els.examCard.classList.add('hidden');els.resultCard.classList.remove('hidden')}

async function submitExam(timedOut=false){
  if(finishing)return;
  if(!timedOut&&!uniqueMapping()){alert('Кожен із трьох виступів має бути призначений рівно одному протоколу.');return}
  if(!timedOut&&!confirm('Надіслати практичний іспит? Після цього змінити протоколи буде неможливо.'))return;
  if(preview){showResult();return}if(!attemptId)return;
  finishing=true;els.submitBtn.disabled=true;clearTimeout(saveTimer);
  const {error}=await client.rpc('pe_submit_practical_exam',{p_attempt_id:attemptId,p_mapping:mapping,p_protocols:protocols,p_timed_out:Boolean(timedOut)});
  if(error){finishing=false;els.submitBtn.disabled=false;alert('Не вдалося надіслати практичний іспит: '+error.message);return}
  showResult();
}

async function startReal(){
  els.startBtn.disabled=true;els.startMessage.classList.remove('hidden');els.startMessage.textContent='Створюємо практичну спробу…';
  const {data,error}=await client.rpc('pe_start_practical_exam');
  if(error){els.startMessage.className='message err';els.startMessage.textContent=error.message.includes('EXAM_CLOSED')?'Практичний іспит закритий адміністратором.':error.message.includes('NO_ATTEMPTS_LEFT')?'Основну спробу вже використано.':'Не вдалося розпочати іспит: '+error.message;return}
  hydrate(asObj(data));begin();
}
async function loadState(){
  const {data,error}=await client.rpc('pe_practical_state');
  if(error){els.startBtn.disabled=true;els.agree.disabled=true;els.startMessage.classList.remove('hidden');els.startMessage.className='message err';els.startMessage.textContent='Серверна логіка практичного іспиту ще не активована в Supabase.';return}
  const state=asObj(data);if(state.exists&&state.status==='in_progress'){hydrate(state);begin();return}if(state.exists){showResult();return}
  els.startMessage.classList.remove('hidden');els.startMessage.textContent='Доступна одна основна практична спроба. Час — 30 хвилин.';
}

els.agree.onchange=()=>els.startBtn.disabled=!els.agree.checked;els.submitBtn.onclick=()=>submitExam(false);
renderVideos();renderSelectors();bindStatic();renderAll();

(async()=>{
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  const {data:{session:s}}=await client.auth.getSession();session=s;if(!session)return;
  const {data:p}=await client.from('profiles').select('role,full_name').eq('user_id',session.user.id).single();profile=p||{};preview=profile.role==='admin';
  if(preview){
    try{const x=JSON.parse(localStorage.getItem('pe_practical_preview')||'{}');mapping=x.mapping||mapping;protocols=x.protocols||protocols;ensureShape()}catch(_){}
    els.startBtn.textContent='Розпочати адміністративний preview';els.startMessage.classList.remove('hidden');els.startMessage.className='message ok';els.startMessage.textContent='Preview не витрачає студентську спробу.';els.timerValue.textContent='PREVIEW';els.startBtn.onclick=begin;return;
  }
  if(profile.role!=='student'){els.startBtn.disabled=true;els.agree.disabled=true;els.startMessage.classList.remove('hidden');els.startMessage.className='message err';els.startMessage.textContent='Реальна практична спроба доступна лише студентам.';return}
  const {data:accessData,error:accessError}=await client.rpc('pe_exam_access_state',{p_exam_key:'practical'});const access=asObj(accessData);
  if(accessError||!access.is_open){els.startBtn.disabled=true;els.agree.disabled=true;els.startMessage.classList.remove('hidden');els.startMessage.className='message err';els.startMessage.textContent='Практичний іспит зараз закритий адміністратором.';return}
  els.startBtn.onclick=startReal;await loadState();
})();
})();