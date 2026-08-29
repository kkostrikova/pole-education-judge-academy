(async()=>{
const cfg=window.PE_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const msg=document.getElementById('reviewMessage');
const blocksEl=document.getElementById('blocks');
const params=new URLSearchParams(location.search);
const attemptId=params.get('id');

const OPEN={
  6:{text:'Під час змагань ви почули викрикування в бік суддівського столу «Суддю на мило». Ваші дії?'},
  7:{text:'Під час змагань один із учасників попросив прокоментувати свій виступ. Ваші дії?'},
  11:{text:'В яких випадках ми НЕ зараховуємо роли?'},
  12:{text:'Під час заходу в стійку спортсмен хитається. Як це вплине на оцінювання технічної складності?'},
  15:{text:'Обов’язкове обертання зараховано чи не зараховано? Чому?',video:'https://www.youtube.com/watch?v=G8Vd8BsAl2I'},
  16:{text:'Подивіться відео. Як ви оціните цей елемент?',video:'https://www.youtube.com/watch?v=fWqn8ao5xZw'},
  28:{text:'Скільки штрафів ви бачите на картинці? Якщо є — які і чому; якщо немає — вкажіть 0.',image:'https://cdn.creativeclaw.co/u/931444b3/images/fde363f4-697f-4489-8fba-50276a5c7bb5.png'},
  31:{text:'В чому відмінність зриву від розмоту (полотна)?'},
  47:{text:'Оцініть костюм як суддя по штрафах. За що тут можна отримати збавку?',image:'https://cdn.creativeclaw.co/u/931444b3/images/d8c275d1-cf87-4385-ae63-bcce0bb90a52.png'}
};

let session,me,attempt,student,blocks=[],scores=[],profiles={};

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const ytId=url=>(url.match(/[?&]v=([^&]+)/)||[])[1]||'';
const scoreFor=q=>scores.find(s=>Number(s.question_no)===Number(q));
const fmt=n=>Number(n||0).toLocaleString('uk-UA',{maximumFractionDigits:1});

function mediaHtml(q){
  const item=OPEN[q];
  if(item.video){
    const id=ytId(item.video);
    return '<div class="review-media"><iframe src="https://www.youtube-nocookie.com/embed/'+encodeURIComponent(id)+'?rel=0" title="Відео до питання '+q+'" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>';
  }
  if(item.image)return '<div class="review-media image"><img src="'+esc(item.image)+'" alt="Зображення до питання '+q+'"></div>';
  return '';
}

function blockStatus(block){
  const qs=block.question_numbers||[];
  const n=qs.filter(q=>scoreFor(q)).length;
  return n+'/'+qs.length;
}

function renderSummary(){
  const manual=scores.reduce((a,s)=>a+Number(s.points||0),0);
  const auto=attempt?.auto_correct;
  const allManual=scores.length===9;
  const published=Boolean(attempt?.result_published_at);

  autoScore.textContent=auto===null||auto===undefined?'—':auto+' / 41';
  manualScore.textContent=fmt(manual)+' / 9';
  if(published){
    finalPreview.textContent=attempt.score+'%';
    reviewState.textContent='Надіслано';
    publishHint.textContent='Результат уже опублікований у кабінеті студента.';
    publishBtn.disabled=true;
    publishBtn.textContent='Результат надіслано';
  }else{
    finalPreview.textContent=(auto!==null&&auto!==undefined)?Math.round(((Number(auto)+manual)/50)*100)+'%':'—';
    reviewState.textContent=allManual?'9 / 9':'Перевірка';
    if(!allManual){
      publishHint.textContent='Щоб надіслати результат, усі 9 відкритих питань мають отримати оцінку.';
      publishBtn.disabled=true;
    }else if(auto===null||auto===undefined){
      publishHint.textContent='Відкриті питання перевірені. Очікуємо підключення автоматичного ключа на сервері.';
      publishBtn.disabled=true;
    }else{
      publishHint.textContent='Усі блоки перевірені. Можна опублікувати фінальний відсоток студенту.';
      publishBtn.disabled=false;
    }
  }
}

function renderBlocks(){
  const ordered=[6,7,11,12,15,16,28,31,47];
  blocksEl.innerHTML=ordered.map(q=>{
    const item=OPEN[q]||{text:'Питання '+q};
    const rec=scoreFor(q);
    const current=rec?Number(rec.points):null;
    const controls=!attempt.result_published_at
      ?'<div class="score-choices" data-q="'+q+'">'+[0,.5,1].map(v=>'<button class="score-btn '+(current===v?'active':'')+'" data-p="'+v+'">'+String(v).replace('.',',')+'</button>').join('')+'</div>'
      :'<div class="readonly-score">'+(current===null?'—':String(current).replace('.',','))+' / 1</div>';

    return '<article class="review-question single-review-question">'+
      '<div class="review-qhead"><span>Питання '+q+'</span>'+controls+'</div>'+
      '<h3>'+esc(item.text)+'</h3>'+
      mediaHtml(q)+
      '<div class="student-answer"><span>Відповідь студента</span><p>'+esc((attempt.answers||{})[q]||'—')+'</p></div>'+
    '</article>';
  }).join('');

  document.querySelectorAll('.score-btn').forEach(b=>b.onclick=async()=>{
    const wrap=b.closest('.score-choices');
    const q=Number(wrap.dataset.q),points=Number(b.dataset.p);
    wrap.querySelectorAll('button').forEach(x=>x.disabled=true);
    const {error}=await client.rpc('pe_save_theory_manual_score',{
      p_attempt_id:attemptId,p_question_no:q,p_points:points
    });
    if(error){
      alert('Не вдалося зберегти оцінку: '+error.message);
      wrap.querySelectorAll('button').forEach(x=>x.disabled=false);
      return;
    }
    const existing=scores.find(s=>Number(s.question_no)===q);
    if(existing){existing.points=points;existing.reviewed_by=session.user.id}
    else scores.push({attempt_id:attemptId,question_no:q,points,reviewed_by:session.user.id});
    renderBlocks();
    renderSummary();
  });
}

async function reload(){
  const {data,error}=await client.rpc('pe_admin_theory_review',{p_attempt_id:attemptId});
  if(error){
    msg.textContent='Не вдалося завантажити відповіді для перевірки: '+error.message;
    msg.className='message err';
    return;
  }
  const payload=Array.isArray(data)?data[0]:data;
  attempt=payload?.attempt||{};
  student=payload?.student||{};
  scores=payload?.scores||[];

  studentName.textContent=student.full_name||student.email||'Студент';
  studentMeta.textContent=(student.email||'')+' · Спроба №'+attempt.attempt_number+' · '+(attempt.status==='timed_out'?'Час вичерпано':attempt.status==='submitted'?'Завершено':'В процесі');

  renderBlocks();
  renderSummary();

  msg.textContent='Оцінка відкритого питання зберігається одразу після натискання 0, 0,5 або 1 і додається до загального результату.';
  msg.className='message ok';
}

const {data:{session:s}}=await client.auth.getSession();
session=s;
if(!session){location.href='auth.html?next='+encodeURIComponent(location.pathname.split('/').pop()+location.search);return}
const {data:admin}=await client.from('profiles').select('*').eq('user_id',session.user.id).single();
me=admin||{};
if(me.role!=='admin'){msg.textContent='Доступ дозволено лише адміністраторам.';msg.className='message err';return}
if(!attemptId){msg.textContent='Не вказано екзаменаційну спробу.';msg.className='message err';return}

publishBtn.onclick=async()=>{
  if(!confirm('Надіслати фінальний результат студенту? Після цього оцінки відкритих питань будуть зафіксовані.'))return;
  publishBtn.disabled=true;
  const {data,error}=await client.rpc('pe_publish_theory_result',{p_attempt_id:attemptId});
  if(error){alert('Результат не надіслано: '+error.message);publishBtn.disabled=false;return}
  attempt=Array.isArray(data)?data[0]:data;
  await reload();
};

await reload();
})();