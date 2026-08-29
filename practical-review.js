(async()=>{
const cfg=window.PE_CONFIG||{},client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const params=new URLSearchParams(location.search),attemptId=params.get('id'),msg=document.getElementById('reviewMessage');
if(!attemptId){msg.textContent='Не вказано спробу практичного іспиту.';msg.className='message err';return}

const PERFORMANCES={
  silks:{name:'Зайцева Злата',discipline:'Повітряні полотна',category:'18+ · Еліт',youtube:'ZuPyocdi5Wk'},
  pole:{name:'Патій Злата',discipline:'Пілон',category:'14–17 · Професіонали',youtube:'PnuPJB1xDt4'},
  hoop:{name:'Лучко Олеся',discipline:'Повітряне кільце',category:'7–9 · Напівпрофесіонали',youtube:'IcdLNwSfLMk'}
};
const TECH={
  pole:{label:'pole sport',dynamic:[['rotation','Обертання 360 та 720 та комбінації'],['dynamic','Динамічні елементи та їх комбінації'],['jumps','Стрибки на пілон та з пілону'],['contact_salto','Контактні сальто'],['salto','Сальто'],['wheels','Колеса та перевороти на пілоні та з пілоном'],['switch','Switch'],['drops','Зриви'],['cascades','Каскади'],['regrips','Перехвати']],general:[['strength','Сила'],['flexibility','Гнучкість'],['coordination','Спритність та координація'],['stands','Стійки та баланси'],['fixation','Фіксація елементів'],['entries','Виходи на пілон'],['mastery','Рівень володіння пілоном']]},
  hoop:{label:'Aerial hoop',dynamic:[['rotation','Обертання та їх комбінації'],['rolls','Роли'],['regrip_body','Перехват зі зміною положення тіла та/або кінцівок'],['jumps','Стрибки на кільце та з кільця'],['salto_turns','Сальто та перевороти'],['dynamic_combo','Комбінації динамічних елементів'],['other_dynamic','Інші динамічні елементи']],general:[['strength','Сила'],['flexibility','Гнучкість'],['coordination','Спритність та координація'],['stands','Стійки та баланси'],['fixation','Фіксація елементів'],['entries','Виходи на кільце'],['mastery','Рівень володіння кільцем']]},
  silks:{label:'Aerial silk',dynamic:[['regrips','Перехвати'],['regrip_body','Перехват зі зміною положення тіла відносно полотна'],['drops','Зриви'],['salto','Сальто'],['cascade_unwraps','Каскадні розмоти'],['dynamic_combo','Комбінації динамічних елементів'],['turns_wheels','Перевороти та колеса'],['wraps','Намоти'],['rotation','Обертання та їх комбінації']],general:[['strength','Сила'],['flexibility','Гнучкість'],['coordination','Спритність та координація'],['stands','Стійки та баланси'],['fixation','Фіксація елементів'],['entries','Виходи на полотно'],['mastery','Рівень володіння полотном']]}
};
const ART=[['overall','Загальне враження від усієї постановки'],['flow','Потік, легкість та віртуозність переходів між рухами'],['creative','Креативні переходи на предметі і в партері'],['originality','Оригінальність та збалансованість хореографічної постановки'],['music','Інтерпретація музики тілом, заповнення музичних акцентів'],['charisma','Харизма, володіння сценою, впевненість'],['eye','Зоровий контакт з глядачем, міміка, виразність та емоційність'],['harmony','Гармонійність усієї постановки'],['balance','Баланс трюків на предметі'],['acro','Складність акробатичних рухів'],['stage','Використання сцени'],['costume','Костюм та сценічний образ']];
const AR=[['start_end','Відсутність логічного початку чи кінця','-3'],['costume_image','Невідповідність костюма образу','-3'],['rig_touch','Торкання системи тросів та кріплення знаряддя під час виступу','-3']];
const PEN=[['lines','Неправильні лінії','-0,2'],['transitions','Погане виконання переходів','-0,5'],['angle','Неправильний кут руху','-0,5'],['slip','Зісковзування','-0,5'],['balance','Втрата балансу','-1'],['tangle','Заплутування (тільки полотно)','-1'],['apparatus_loss','Втрата предмету (тільки кільце)','-1'],['wipe','Витирання рук, поправляння костюма, зачіски, підспівування','-1'],['fall','Падіння','-5'],['erotic','Відверті чи еротичні рухи та позиції','-5']];
const PO=[['repeat','Надмірна повторюваність рухів','-2'],['apparatus_use','Нерівноцінне використання обох пілонів та незаповнення висоти','-2'],['costume','Проблеми з костюмом та зачіскою','-5']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const {data:{session}}=await client.auth.getSession();if(!session){location.href='auth.html';return}
const {data:me}=await client.from('profiles').select('role').eq('user_id',session.user.id).single();if(me?.role!=='admin'){msg.textContent='Доступ лише для адміністратора.';msg.className='message err';return}
const {data,error}=await client.rpc('pe_admin_practical_review',{p_attempt_id:attemptId});
if(error){msg.textContent='Не вдалося завантажити практичну спробу: '+error.message;msg.className='message err';return}
const payload=Array.isArray(data)?data[0]:data,attempt=payload?.attempt||{},student=payload?.student||{},mapping=attempt.mapping||{},protocols=attempt.protocols||{};
studentName.textContent=student.full_name||student.email||'Студент';
studentMeta.textContent=(student.email||'')+' · Спроба №'+(attempt.attempt_number||1)+' · '+(attempt.status==='timed_out'?'Час вичерпано':'Завершено');

const assignmentByPerf={};
Object.entries(mapping).forEach(([k,v])=>{if(v)assignmentByPerf[v]=k==='technique'?'Технічна складність':k==='artistry'?'Артистизм та хореографія':'Штрафи'});
videoReviewGrid.innerHTML=Object.entries(PERFORMANCES).map(([id,p])=>'<article class="review-video"><div class="frame"><iframe src="https://www.youtube-nocookie.com/embed/'+p.youtube+'?rel=0" allowfullscreen></iframe></div><div class="copy"><h3>'+esc(p.name)+'</h3><p>'+esc(p.discipline)+' · '+esc(p.category)+'</p><span class="assignment">'+esc(assignmentByPerf[id]||'Не призначено')+'</span></div></article>').join('');

function protocolBox(rows){
  return '<div class="review-protocol"><div class="review-protocol-head"><span>Критерій</span><span>Макс./списання</span><span>Оцінка</span><span>Коментар</span></div>'+rows+'</div>';
}
const app=mapping.technique,tech=TECH[app],tstore=protocols.technique?.byApparatus?.[app]||{scores:{},comments:{}};
let tr='';
if(tech){
 tr+='<div class="review-section">Протокол оцінки технічної складності '+esc(tech.label)+'</div><div class="review-section">Динамічна складність</div>';
 tr+=tech.dynamic.map(([id,label])=>'<div class="review-row"><strong>'+esc(label)+'</strong><span class="muted">5</span><span class="answer">'+esc(tstore.scores?.[id]??0)+'</span><span class="comment">'+esc(tstore.comments?.[id]||'—')+'</span></div>').join('');
 tr+='<div class="review-section">Загальні фізичні критерії</div>';
 tr+=tech.general.map(([id,label])=>'<div class="review-row"><strong>'+esc(label)+'</strong><span class="muted">5</span><span class="answer">'+esc(tstore.scores?.[id]??0)+'</span><span class="comment">'+esc(tstore.comments?.[id]||'—')+'</span></div>').join('');
}else tr='<div class="message err">Студент не призначив виступ для технічного протоколу.</div>';
techReview.innerHTML=protocolBox(tr);

const a=protocols.artistry||{};
let ar=ART.map(([id,label])=>'<div class="review-row"><strong>'+esc(label)+'</strong><span class="muted">5</span><span class="answer">'+esc(a.scores?.[id]??0)+'</span><span class="comment">'+esc(a.comments?.[id]||'—')+'</span></div>').join('');
ar+='<div class="review-section">Загальне зниження балів · одноразово</div>';
ar+=AR.map(([id,label,ded])=>'<div class="review-row"><strong>'+esc(label)+'</strong><span class="muted">'+ded+'</span><span class="answer">'+(a.reductions?.[id]?'Так':'Ні')+'</span><span class="comment">'+esc(a.reductionComments?.[id]||'—')+'</span></div>').join('');
artReview.innerHTML=protocolBox(ar);

const p=protocols.penalties||{};
let pr='<div class="review-section">Збавки за кожен випадок</div>';
pr+=PEN.map(([id,label,ded])=>'<div class="review-row"><strong>'+esc(label)+'</strong><span class="muted">'+ded+'</span><span class="answer">'+esc(p.counts?.[id]??0)+'</span><span class="comment">'+esc(p.comments?.[id]||'—')+'</span></div>').join('');
pr+='<div class="review-section">Загальне зниження балів · одноразово</div>';
pr+=PO.map(([id,label,ded])=>'<div class="review-row"><strong>'+esc(label)+'</strong><span class="muted">'+ded+'</span><span class="answer">'+(p.once?.[id]?'Так':'Ні')+'</span><span class="comment">'+esc(p.onceComments?.[id]||'—')+'</span></div>').join('');
penReview.innerHTML=protocolBox(pr);

let decision=attempt.result_published_at?Boolean(attempt.passed):null;
adminComment.value=attempt.admin_comment||'';
distinctionCheck.checked=Boolean(attempt.distinction);
function renderDecision(){
 passBtn.classList.toggle('selected',decision===true);failBtn.classList.toggle('selected',decision===false);
 publishBtn.disabled=decision===null;
 distinctionCheck.disabled=decision!==true;
 if(decision!==true)distinctionCheck.checked=false;
 if(attempt.result_published_at){reviewState.textContent=attempt.passed?(attempt.distinction?'Складено · з відзнакою':'Складено'):'Не складено';reviewState.className='pill '+(attempt.passed?'ok':'warn')}
}
passBtn.onclick=()=>{decision=true;renderDecision()};failBtn.onclick=()=>{decision=false;renderDecision()};
publishBtn.onclick=async()=>{
 if(decision===null)return;
 if(!confirm('Надіслати результат практичного іспиту студенту?'))return;
 publishBtn.disabled=true;
 const payload={p_attempt_id:attemptId,p_passed:decision,p_comment:adminComment.value,p_distinction:decision===true&&distinctionCheck.checked};
 let {data:pub,error:pubErr}=await client.rpc('pe_publish_practical_result',payload);
 if(pubErr){
   const fallback=await client.rpc('pe_publish_practical_result',{p_attempt_id:attemptId,p_passed:decision,p_comment:adminComment.value});
   if(fallback.error){msg.textContent='Не вдалося надіслати результат: '+fallback.error.message;msg.className='message err';publishBtn.disabled=false;return}
   pub=fallback.data;
   if(payload.p_distinction){msg.textContent='Результат надіслано, але позначку «з відзнакою» ще не збережено. Запустіть supabase-certificates-patch.sql.';msg.className='message err';attempt.distinction=false;renderDecision();return}
 }
 const saved=Array.isArray(pub)?pub[0]:pub;
 attempt.result_published_at=saved?.result_published_at||new Date().toISOString();
 attempt.passed=decision;
 attempt.distinction=Boolean(saved?.distinction??payload.p_distinction);
 msg.textContent=attempt.distinction?'Результат надіслано. Практична частина відзначена як високий рівень.':'Результат практичного іспиту надіслано студенту.';
 msg.className='message ok';renderDecision();
};
renderDecision();msg.textContent='Протоколи завантажено. Оберіть «Складено» або «Не складено». Для сильного виконання можна додати відзнаку.';msg.className='message ok';
})();