(()=>{
const cfg=window.PE_CONFIG||{};
const DURATION_MS=(cfg.theoryDurationMinutes||60)*60*1000;
const PASS=cfg.theoryPassScore||60;

const media=(label,kind='media',url='')=>({label,kind,url,pending:!url});
const Q=[
{no:1,type:'single',text:'Швидкісний спуск зі зміною положення тіла на пілоні — це…',options:['Зрив','Світч','Каскад','Перехоплення']},
{no:2,type:'multi',text:'Які бувають намоти? (декілька варіантів відповіді)',options:['Циклічні','Координаційні','Каскадні','Силові'],answer:['Координаційні','Силові']},
{no:3,type:'single',text:'Обертання 360 градусів навколо своєї осі — це…',options:['Обертання на статичному пілоні','Сальто','Світч','Переворот']},
{no:4,type:'multi',text:'В яку графу протоколу ми зараховуємо контактне сальто з підлоги? (декілька варіантів відповіді)',options:['Контактне сальто','Сальто','Динамічні елементи та комбінації','Перевороти','Спритність та координація'],answer:['Контактне сальто','Динамічні елементи та комбінації','Спритність та координація']},
{no:5,type:'single',text:'Як ви оціните гнучкість, якщо за весь номер було зроблено: 1 шпагат 160° на праву ногу, 1 шпагат 180° на ліву ногу та 1 задня затяжка із зігнутими ногами?',options:['0,5–1,5','2–3','3,5–4,5','5','0']},
{no:6,type:'text',text:'Під час змагань ви почули викрикування в бік суддівського столу «Суддю на мило». Ваші дії?',note:'Відкрита ситуаційна відповідь. Вона не оцінюється автоматично та буде доступна адміністраторам.'},
{no:7,type:'text',text:'Під час змагань один із учасників попросив прокоментувати свій виступ. Ваші дії?',note:'Відкрита ситуаційна відповідь.'},
{no:8,type:'multi',text:'Чого завжди необхідно дотримуватись суддям під час змагань? (декілька варіантів відповіді)',options:['Правил змагань','Закону України','Правил здорового харчування','Правил етикету','Кодексу етичних норм'],answer:['Правил змагань','Закону України','Правил етикету','Кодексу етичних норм']},
{no:9,type:'multi',text:'Що складає оцінку «Спритності та координації»? (декілька варіантів відповіді)',options:['Вміння утримувати елемент','Вміння швидко переходити із елементу в елемент','Вміння тримати рівновагу','Точно виконувати вправи'],answer:['Вміння швидко переходити із елементу в елемент','Точно виконувати вправи']},
{no:10,type:'single',text:'В яких випадках ми НЕ зараховуємо зриви на пілоні?',options:['Спортсмен пролетів менше 2 метрів висоти','Повільний спуск з утриманням знаряддя іншою частиною тіла','Зрив зроблено вниз головою','Неправильний ракурс виконання']},
{no:11,type:'text',text:'В яких випадках ми НЕ зараховуємо роли?',note:'Відкрита відповідь.'},
{no:12,type:'text',text:'Під час заходу в стійку спортсмен хитається. Як це вплине на оцінювання технічної складності?',note:'Відкрита ситуаційна відповідь.'},
{no:13,type:'single',text:'Яка мінімально допустима відстань між пілонами на змаганнях?',options:['2 метри','3 метри','10 метрів','1 м 80 см']},
{no:14,type:'single',text:'Яке мінімально допустиме навантаження на автоматичну електричну лебідку на змаганнях?',options:['350 кг','500 кг','1 тонна','3,5 тонни']},
{no:15,type:'text',text:'Обов’язкове обертання зараховано чи не зараховано? Чому?',media:media('Відео до обов’язкового обертання','video','https://www.youtube.com/watch?v=G8Vd8BsAl2I'),note:'Вимоги з вихідної форми: більше 360° обертання; контакт кистями рук/зап’ястями без контакту з передпліччям; початок обома руками в прямому хваті; нижня рука перехоплює пілон у прямому хваті; дедліфт без контакту з підлогою; початок у «pencil», завершення — у положенні на вибір.'},
{no:16,type:'text',text:'Подивіться відео. Як ви оціните цей елемент?',media:media('Відео до оцінювання елемента','video','https://www.youtube.com/watch?v=fWqn8ao5xZw'),note:'Відкрита відповідь: студент сам формулює суддівську оцінку.'},
{no:17,type:'single',text:'Як ви оціните побачений шпагат у протоколі «Технічна складність»?',options:['Оціню шпагат та внесу бал у графу «Гнучкість»','Не буду оцінювати шпагат','Зафіксую шпагат у чернетці та додивлюсь номер до кінця','Пораджусь з іншими суддями','Все вище перераховане'],pendingKey:true,media:media('Відео зі шпагатом','video','https://www.youtube.com/watch?v=m6oLgE2yaLg'),note:'Ключ до цього питання залишено на підтвердження перед публікацією. У старій формі воно входило до автоматичної частини.'},
{no:18,type:'single',text:'Чи є паралель відносно підлоги передньої ноги?',options:['Так, паралель зараховано','Ні, паралель не зараховано'],media:media('Відео для перевірки паралелі','video','https://www.youtube.com/watch?v=sTstmG5EIi4')},
{no:19,type:'single',text:'Який кут розкриття шпагату ви бачите на відео?',options:['160','180','нижче 160','нижче 180','більше 180'],media:media('Відео для визначення кута шпагату','video','https://www.youtube.com/watch?v=MGfdEpSGPLw')},
{no:20,type:'single',text:'На змаганнях організатори посадили вас судити категорію, де виступають спортсмени, яким ви допомагали готуватись. Як називається ця ситуація?',options:['Ніяк не називається','Порушення правил','Зрив номеру','Конфлікт інтересів']},
{no:21,type:'single',text:'Як ви оціните рівень різних перехоплень з одночасним перехопленням двох рук?',options:['Низький','Середній','Високий']},
{no:22,type:'single',text:'Як ви оціните рівень виконання базового колеса з опорою на одну руку?',options:['Низький','Середній','Високий']},
{no:23,type:'single',text:'Як називаються намоти, які за виконанням повільніші та характеризуються циклами з переворотом через голову або навколо своєї осі?',options:['Силові','Концентричні','Координаційні','Циклічні']},
{no:24,type:'single',text:'За якими критеріями ви будете оцінювати рівень володіння знаряддям?',options:['Різноманітність підлазів, різноманітність переходів, оригінальність переходів, використання висоти знаряддя','Різноманітність підлазів, різноманітність заходів, різноманітність та оригінальність переходів','Різноманітність підлазів, різноманітність заходів, різноманітність та оригінальність переходів, використання всієї висоти знаряддя','Різноманітність підлазів, різноманітність переходів, оригінальність переходів']},
{no:25,type:'single',text:'Що таке фіксація елемента?',options:['Вміння робити обертання','Вміння володіти власним тілом','Вміння утримувати елемент в обертанні','Вміння утримувати елемент певний час']},
{no:26,type:'single',text:'До якого загального фізичного критерію відноситься виконання прапорців дедліфтом?',options:['Спритність та координація','Гнучкість','Вміння володіти знаряддям','Сила']},
{no:27,type:'single',text:'До неправильних ліній ми відносимо:',options:['Коліна і носки','Постава, плечі','Пальці рук і пальці ніг','Перші 2 варіанти','Усе перелічене вище']},
{no:28,type:'text',text:'Скільки штрафів ви бачите на картинці? Якщо є — які і чому; якщо немає — вкажіть 0.',media:media('Зображення до питання про штрафи','image'),note:'Відкрита відповідь.'},
{no:29,type:'single',text:'Скільки штрафів ви бачите на картинці?',options:['Заднє коліно','Обидва коліна','Неправильний ракурс','Варіант 1, 2','Варіант 1, 3','Варіант 2, 3'],media:media('Зображення до питання 30','image')},
{no:29,type:'single',text:'Чи зарахує суддя з артистизму махове колесо, якщо після нього була незначна втрата балансу?',options:['Так, зарахує','Не зарахує','Оцінить елемент, але з незначним зниженням балів.']},
{no:29,type:'text',text:'В чому відмінність зриву від розмоту (полотна)?',note:'Відкрита відповідь.'},
{no:29,type:'single',text:'Чи потрібно ставити тут штраф за скорочення верхньої стопи?',options:['Так, потрібно','Ні, така стопа допускається'],media:media('Зображення до питання про верхню стопу','image')},
{no:29,type:'single',text:'Скільки збавок за лінії ви поставите спортсмену?',options:['Скоріше 1','Скоріше 2','Скоріше 3'],media:media('Зображення/відео до оцінювання ліній','image')},
{no:29,type:'single',text:'Під час виконання акробатичного елементу спортсмен впав. Як ви оціните це в бланку «Артистизм і хореографія»?',options:['Елемент буде зарахований зі зниженням','0, елемент не буде зарахованим взагалі.']},
{no:29,type:'single',text:'У спортсмена костюм з надмірним оголенням сідниць, а під час виступу відпав елемент костюму. Як ми оцінимо це в бланку штрафів Pole Education?',options:['Поставимо збавку -5','Поставимо дві збавки по -5 за кожен випадок, в сумі 10 балів.']},
{no:29,type:'single',text:'У дорослого спортсмена під час виступу пішла носом кров. Як повинен вчинити головний суддя?',options:['Негайно зупинити виступ','Почекати 30 секунд, можливо все владнається','Нічого не робити, дорослий сам повинен вирішувати, продовжувати чи ні.']},
{no:29,type:'single',text:'Спортсмен під час виступу поправив зачіску, потім поправив на сідницях костюм. Скільки штрафів ми поставимо?',options:['Знімемо штраф разово, за проблеми з костюмом.','Буде 2 збавки, за кожен раз.']},
{no:29,type:'single',text:'Чи є доречним виконання елементу «колиска» в дитячих категоріях?',options:['Ні, недоречний, і має бути оштрафований у пункті «Відверті рухи та позиції»','Доречний і допустимий у правильних ракурсах.','Будь-яка позиція з розведеними ногами не допускається в дитячих категоріях.']},
{no:29,type:'single',text:'Чи обов’язковою є наявність спідньої білизни під костюмом?',options:['Так, обов’язково мати спідню білизну.','Наявність спідньої білизни обов’язкова тільки в дорослих категоріях.','Це на розсуд спортсмена.']},
{no:29,type:'single',text:'Чи ставимо ми збавку за ракурс, якщо спортсмен виконував елемент на динамічному предметі, витримав 2 секунди, але не докрутив до демонстрації загальноприйнятих ліній?',options:['Так, ми ставимо збавку за ракурс.','Ні, на динамічному предметі ми не ставимо збавку за ракурс. Тільки на статиці.']},
{no:29,type:'single',text:'Чи можемо ми поставити максимальний бал в оцінці заповнення сцени, якщо сама сцена була заповнена максимально, але пілони використані лише на 70%?',options:['Ми поставимо оцінку 5.','4, бо потрібно вилазити до самого верху для максимальної оцінки.']},
{no:29,type:'single',text:'На статичному пілоні спортсмен провів приблизно хвилину, на динамічному — рівно стільки ж, але доліз тільки до середини. Чи вплине це на оцінку «Баланс трюків на предметі» в протоколі арт і хорео?',options:['Ні, не вплине, баланс можна показати без заповнення усієї висоти динаміки','Так, суттєво вплине, ми точно знизимо бал.']},
{no:29,type:'single',text:'На попередніх трьох змаганнях спортсмен допускав багато значних похибок, включно з падінням. На поточних змаганнях цих похибок не було. Як ми оцінимо рівень спортсмена?',options:['Знизимо оцінку, бо ми знаємо, який насправді в нього рівень, йому просто пощастило.','Будемо покладатися тільки на результат поточного виступу.']},
{no:29,type:'single',text:'Під час виступу ви опустили очі у протокол, а підвівши погляд побачили, що спортсмен неначе похитнувся. Ви не впевнені, що це була втрата балансу. Що ви зробите?',options:['Перше враження правильне, поставлю збавку за баланс','Я не ставитиму збавку, навіть якщо вона була: при сумнівах судді перевага завжди надається спортсмену.']},
{no:29,type:'single',text:'Чи допускається такий костюм у категорії Pole Sport?',options:['Так, якщо крила не заважають виступу','Ні, реквізит та подібні костюми не допускаються в Pole Sport','Крила можна, а за хвіст буде збавка.'],media:media('Зображення костюму до питання 46','image')},
{no:29,type:'single',text:'Чи будемо ми нижче оцінювати спортсмена, якщо у нього є зайва вага?',options:['Так, це не естетично, і ми обов’язково знижуватимемо бал.','Будемо знижувати тільки тоді, якщо це дуже надмірно.','Ні, вага спортсмена не впливатиме на нашу оцінку.']},
{no:29,type:'text',text:'Оцініть костюм як суддя по штрафах. За що тут можна отримати збавку?',media:media('Зображення костюму до відкритого питання','image'),note:'Відкрита відповідь.'},
{no:29,type:'single',text:'Чи бере до уваги суддя з «Артистизму і хореографії» складність елементів, оцінюючи критерій «Баланс трюків на предметі»?',options:['Так, чим складніші трюки, тим буде більша оцінка','Ні, в цьому критерії оцінюється рівноцінність виконання різних груп елементів, без надання переваги одній групі.']},
{no:29,type:'single',text:'Учасник закінчив свій виступ до закінчення музики і зробив уклін якраз в останні ноти. Як ми це оцінимо?',options:['Знімемо бал за відсутність логічного кінця.','Не будемо знімати бал, адже уклін допускається, коли лунає музика. Головне — закінчити в останню ноту.']},
{no:50,type:'single',text:'Я — гарний суддя, постійно розвиваюся, навчаюся та вдосконалюю свої професійні навички.',options:['Погоджуюсь'],note:'Фінальна позитивна крапка іспиту. Відповідь зараховується до автоматичної частини.'}
];

const els={startCard:document.getElementById('startCard'),examCard:document.getElementById('examCard'),resultCard:document.getElementById('resultCard'),agree:document.getElementById('agreeRules'),startBtn:document.getElementById('startBtn'),startMessage:document.getElementById('startMessage'),timer:document.getElementById('timer'),timerValue:document.getElementById('timerValue'),questionType:document.getElementById('questionType'),questionCounter:document.getElementById('questionCounter'),answeredLabel:document.getElementById('answeredLabel'),progressFill:document.getElementById('progressFill'),originalNo:document.getElementById('originalNo'),questionText:document.getElementById('questionText'),questionNote:document.getElementById('questionNote'),mediaSlot:document.getElementById('mediaSlot'),answerSlot:document.getElementById('answerSlot'),prevBtn:document.getElementById('prevBtn'),nextBtn:document.getElementById('nextBtn'),flagBtn:document.getElementById('flagBtn'),navigator:document.getElementById('navigator'),finishBtn:document.getElementById('finishBtn')};
let client,session,profile,preview=false,current=0,answers={},flags={},startedAt=0,timerId=null;

const storageKey=uid=>'pe_final_theory_preview_'+uid;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function isAnswered(q){const a=answers[q.no];return q.type==='multi'?Array.isArray(a)&&a.length>0:q.type==='text'?Boolean(String(a||'').trim()):a!==undefined&&a!==null&&a!==''}
function saveLocal(){if(!session)return;localStorage.setItem(storageKey(session.user.id),JSON.stringify({answers,flags,current,startedAt}))}
function loadLocal(){if(!session)return;try{const x=JSON.parse(localStorage.getItem(storageKey(session.user.id))||'{}');answers=x.answers||{};flags=x.flags||{};current=Number.isInteger(x.current)?Math.min(x.current,Q.length-1):0;startedAt=x.startedAt||0}catch(_){}}
function renderMedia(q){
  if(!q.media){els.mediaSlot.classList.add('hidden');els.mediaSlot.innerHTML='';return}
  els.mediaSlot.classList.remove('hidden');
  if(q.media.kind==='video'&&q.media.url){
    const id=(q.media.url.match(/[?&]v=([^&]+)/)||q.media.url.match(/youtu\.be\/([^?&]+)/)||[])[1]||'';
    els.mediaSlot.innerHTML='<strong>Відеозавдання</strong><span>'+esc(q.media.label)+'</span>'+(id?'<div class="youtube-wrap"><iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0" title="'+esc(q.media.label)+'" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><a class="youtube-link" href="'+esc(q.media.url)+'" target="_blank" rel="noopener">Відкрити відео на YouTube ↗</a>':'');
    return;
  }
  els.mediaSlot.innerHTML='<strong>'+esc(q.media.kind==='video'?'Відеозавдання':'Візуальне завдання')+'</strong><span>'+esc(q.media.label)+'. Оригінальний медіафайл буде підключено перед відкриттям фінального іспиту студентам.</span>';
}
function renderAnswer(q){
  if(q.type==='text'){els.answerSlot.innerHTML='<textarea class="open-answer" id="openAnswer" placeholder="Введіть вашу відповідь…">'+esc(answers[q.no]||'')+'</textarea>';document.getElementById('openAnswer').addEventListener('input',e=>{answers[q.no]=e.target.value;saveLocal();renderNavigator()});return}
  const type=q.type==='multi'?'checkbox':'radio',selected=q.type==='multi'?(answers[q.no]||[]):answers[q.no];
  els.answerSlot.innerHTML=q.options.map((o,i)=>{const checked=q.type==='multi'?selected.includes(o):selected===o;return '<label class="option '+(checked?'selected':'')+'"><input type="'+type+'" name="q'+q.no+'" value="'+i+'" '+(checked?'checked':'')+'><span>'+esc(o)+'</span></label>'}).join('');
  els.answerSlot.querySelectorAll('input').forEach(inp=>inp.addEventListener('change',()=>{
    const val=q.options[Number(inp.value)];
    if(q.type==='multi'){let arr=Array.isArray(answers[q.no])?[...answers[q.no]]:[];if(inp.checked&&!arr.includes(val))arr.push(val);if(!inp.checked)arr=arr.filter(x=>x!==val);answers[q.no]=arr}else answers[q.no]=val;
    saveLocal();renderQuestion();renderNavigator()
  }))
}
function renderQuestion(){
  const q=Q[current];els.questionType.textContent=q.type==='text'?'OPEN JUDGE RESPONSE':q.media?'MEDIA QUESTION':q.type==='multi'?'MULTIPLE SELECT':'SINGLE SELECT';els.questionCounter.textContent='Завдання '+(current+1)+' / '+Q.length;els.originalNo.textContent='Питання '+q.no;els.questionText.textContent=q.text;
  if(q.note){els.questionNote.textContent=q.note;els.questionNote.classList.remove('hidden')}else els.questionNote.classList.add('hidden');
  renderMedia(q);renderAnswer(q);els.prevBtn.disabled=current===0;els.nextBtn.textContent=current===Q.length-1?'До завершення →':'Далі →';els.flagBtn.classList.toggle('active',Boolean(flags[q.no]));els.flagBtn.textContent=flags[q.no]?'Позначено ✓':'Позначити для перевірки';renderProgress();renderNavigator()
}
function renderProgress(){const n=Q.filter(isAnswered).length;els.answeredLabel.textContent=n+' з '+Q.length+' мають відповідь';els.progressFill.style.width=Math.round(n/Q.length*100)+'%'}
function renderNavigator(){els.navigator.innerHTML=Q.map((q,i)=>'<button class="nav-q '+(i===current?'current ':'')+(isAnswered(q)?'answered ':'')+(flags[q.no]?'flagged':'')+'" data-i="'+i+'" title="Питання '+q.no+'">'+(i+1)+'</button>').join('');els.navigator.querySelectorAll('button').forEach(b=>b.onclick=()=>{current=Number(b.dataset.i);saveLocal();renderQuestion();scrollTo({top:0,behavior:'smooth'})})}
function updateTimer(){if(preview){els.timerValue.textContent='PREVIEW';return}const left=Math.max(0,DURATION_MS-(Date.now()-startedAt)),m=Math.floor(left/60000),s=Math.floor(left%60000/1000);els.timerValue.textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');els.timer.classList.toggle('warning',left<=10*60000);els.timer.classList.toggle('danger',left<=5*60000);if(left<=0)finish(true)}
function begin(){els.startCard.classList.add('hidden');els.examCard.classList.remove('hidden');if(!startedAt)startedAt=Date.now();saveLocal();renderQuestion();updateTimer();if(!preview)timerId=setInterval(updateTimer,1000)}
function normalize(a){return Array.isArray(a)?[...a].sort():a}
function scoreExam(){let correct=0,max=0,pending=0;Q.forEach(q=>{if(q.type==='text')return;if(q.pendingKey){pending++;return}if(q.answer==null)return;max++;const a=normalize(answers[q.no]),k=normalize(q.answer);if(JSON.stringify(a)===JSON.stringify(k))correct++});return{correct,max,pending,percent:max?Math.round(correct/max*100):0}}
async function finish(timedOut=false){
  if(!preview&&!timedOut){const missing=Q.filter(q=>!isAnswered(q));if(missing.length&&!confirm('Без відповіді залишилось '+missing.length+' завдань. Завершити іспит?'))return;if(!confirm('Після завершення змінити відповіді буде неможливо. Завершити іспит?'))return}
  if(timerId)clearInterval(timerId);
  const s=scoreExam(),elapsed=Math.min(DURATION_MS,Date.now()-startedAt),open=Q.filter(q=>q.type==='text'&&isAnswered(q)).length,pass=false;
  els.examCard.classList.add('hidden');els.resultCard.classList.remove('hidden');
  const badge=document.getElementById('resultBadge');badge.textContent=preview?'PREVIEW':'—';badge.className='result-badge';document.getElementById('resultTitle').textContent=preview?'Попередній перегляд результату':pass?'Іспит складено':'Іспит не складено';document.getElementById('resultText').textContent=preview?'Це адміністративний preview: результат не записано як екзаменаційну спробу. Медіа та ключ питання 17 ще потребують фінального підключення.':(timedOut?'60 хвилин завершилися. Система зафіксувала всі відповіді, які були внесені до цього моменту.':'Результат зафіксовано. Правильні відповіді не відображаються.');
  document.getElementById('resultScore').textContent=preview?'не рахується':'—';document.getElementById('resultTime').textContent=Math.ceil(elapsed/60000)+' хв';document.getElementById('resultOpen').textContent=open;
  if(preview)localStorage.removeItem(storageKey(session.user.id));
}
els.agree.addEventListener('change',()=>els.startBtn.disabled=!els.agree.checked);
els.prevBtn.onclick=()=>{if(current>0){current--;saveLocal();renderQuestion();scrollTo({top:0,behavior:'smooth'})}};
els.nextBtn.onclick=()=>{if(current<Q.length-1){current++;saveLocal();renderQuestion();scrollTo({top:0,behavior:'smooth'})}else document.querySelector('.finish-row').scrollIntoView({behavior:'smooth'})};
els.flagBtn.onclick=()=>{const no=Q[current].no;flags[no]=!flags[no];saveLocal();renderQuestion()};
els.finishBtn.onclick=()=>finish(false);

(async()=>{
  client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);const {data:{session:s}}=await client.auth.getSession();session=s;if(!session)return;
  const {data:p}=await client.from('profiles').select('role,full_name').eq('user_id',session.user.id).single();profile=p||{};preview=profile.role==='admin'&&!cfg.finalExamOpen;
  loadLocal();
  if(preview){els.startBtn.textContent='Розпочати адміністративний перегляд';els.startMessage.textContent='Фінальний іспит поки закритий для студентів. Ви зайшли як адміністратор і можете перевірити структуру без витрачання спроби.';els.startMessage.className='message ok';els.timerValue.textContent='PREVIEW'}
  else if(!cfg.finalExamOpen){els.startBtn.disabled=true;els.agree.disabled=true;els.startMessage.textContent='Фінальний теоретичний іспит поки закритий адміністратором курсу.';els.startMessage.className='message err'}
  else{els.startMessage.textContent='Одна основна спроба. Прохідний результат — '+PASS+'%. Час — '+Math.round(DURATION_MS/60000)+' хвилин.';els.startMessage.className='message'}
  els.startBtn.onclick=begin;
  if(startedAt&&cfg.finalExamOpen&&!preview){begin()}
})();
})();