(async()=>{
const cfg=window.PE_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const msg=document.getElementById('adminMessage');

const {data:{session}}=await client.auth.getSession();
if(!session){location.href='auth.html';return}
const {data:me}=await client.from('profiles').select('*').eq('user_id',session.user.id).single();
if(me?.role!=='admin'){msg.textContent='Доступ заборонено. Ця сторінка доступна лише адміністраторам.';msg.className='message err';return}

const theoryAccessBtn=document.getElementById('theoryAccessBtn');
const theoryAccessText=document.getElementById('theoryAccessText');
const practicalAccessBtn=document.getElementById('practicalAccessBtn');
const practicalAccessText=document.getElementById('practicalAccessText');
let theoryOpen=false,practicalOpen=false;

async function refreshExamAccess(examKey,btn,textEl){
  const {data,error}=await client.rpc('pe_exam_access_state',{p_exam_key:examKey});
  if(error){
    btn.disabled=true;
    textEl.textContent='Керування доступом стане активним після підключення серверної логіки Supabase.';
    return false;
  }
  const state=Array.isArray(data)?data[0]:data;
  const open=Boolean(state?.is_open);
  textEl.textContent=open?'Іспит відкритий для студентів.':'Іспит закритий для студентів.';
  btn.textContent=open?'Закрити іспит':'Відкрити іспит';
  btn.className='btn '+(open?'secondary':'primary');
  btn.disabled=false;
  return open;
}

async function refreshTheoryAccess(){
  theoryOpen=await refreshExamAccess('theory',theoryAccessBtn,theoryAccessText);
}
async function refreshPracticalAccess(){
  practicalOpen=await refreshExamAccess('practical',practicalAccessBtn,practicalAccessText);
}

theoryAccessBtn.onclick=async()=>{
  theoryAccessBtn.disabled=true;
  const next=!theoryOpen;
  const {error}=await client.rpc('pe_set_exam_access',{p_exam_key:'theory',p_open:next});
  if(error){alert('Не вдалося змінити доступ: '+error.message);theoryAccessBtn.disabled=false;return}
  await refreshTheoryAccess();
};
practicalAccessBtn.onclick=async()=>{
  practicalAccessBtn.disabled=true;
  const next=!practicalOpen;
  const {error}=await client.rpc('pe_set_exam_access',{p_exam_key:'practical',p_open:next});
  if(error){alert('Не вдалося змінити доступ: '+error.message);practicalAccessBtn.disabled=false;return}
  await refreshPracticalAccess();
};

await Promise.all([refreshTheoryAccess(),refreshPracticalAccess()]);

const [
  {data:profiles,error:profilesError},
  {data:mods},
  attemptsResp,
  {data:legacyTheory},
  practicalAttemptsResp,
  ndaResp
]=await Promise.all([
  client.from('profiles').select('*').order('created_at',{ascending:false}),
  client.from('module_results').select('*'),
  client.rpc('pe_admin_theory_attempts'),
  client.from('theory_exam_results').select('*'),
  client.rpc('pe_admin_practical_attempts'),
  client.from('course_nda_signatures').select('user_id,agreement_version,signed_at')
]);

if(profilesError){msg.textContent='Не вдалося завантажити студентів.';msg.className='message err';return}

const attempts=attemptsResp.error?[]:(Array.isArray(attemptsResp.data)?attemptsResp.data:(attemptsResp.data||[]));
const practicalAttempts=practicalAttemptsResp.error?[]:(Array.isArray(practicalAttemptsResp.data)?practicalAttemptsResp.data:(practicalAttemptsResp.data||[]));
const students=(profiles||[]).filter(p=>p.role==='student');
const byMods={};
(mods||[]).forEach(r=>{
  byMods[r.user_id]??={};
  if(!byMods[r.user_id][r.module_id]||r.score>byMods[r.user_id][r.module_id].score)byMods[r.user_id][r.module_id]=r;
});

const latest=(rows,key='completed_at')=>{
  const m={};
  (rows||[]).forEach(r=>{
    if(!m[r.user_id]||new Date(r[key]||r.created_at||0)>new Date(m[r.user_id][key]||m[r.user_id].created_at||0))m[r.user_id]=r;
  });
  return m;
};
const t=latest(attempts,'completed_at');
const legacy=latest(legacyTheory);
const p=latest(practicalAttempts,'completed_at');
const ndaRows=ndaResp.error?[]:(ndaResp.data||[]);
const ndaByUser={};
ndaRows.forEach(x=>{if(!ndaByUser[x.user_id]||new Date(x.signed_at)>new Date(ndaByUser[x.user_id].signed_at))ndaByUser[x.user_id]=x});

studentCount.textContent=students.length;
activeCount.textContent=students.filter(s=>Object.values(byMods[s.user_id]||{}).some(x=>x.passed)).length;
theoryPassed.textContent=students.filter(s=>{
  const a=t[s.user_id];
  return a?a.result_published_at&&a.passed:legacy[s.user_id]?.passed;
}).length;
certPassed.textContent=students.filter(s=>{
  const done=Object.values(byMods[s.user_id]||{}).filter(x=>x.passed).length;
  const ta=t[s.user_id],pa=p[s.user_id];
  const theoryOk=ta?Boolean(ta.result_published_at&&ta.passed):Boolean(legacy[s.user_id]?.passed);
  const practicalOk=Boolean(pa?.result_published_at&&pa?.passed);
  return done===8&&theoryOk&&practicalOk;
}).length;

const theoryLabel=a=>{
  if(!a)return '—';
  if(a.result_published_at)return a.score+'%';
  if(a.status==='in_progress')return 'Складає';
  return 'На перевірці';
};

studentBody.innerHTML=students.length?students.map(s=>{
  const done=Object.values(byMods[s.user_id]||{}).filter(x=>x.passed).length;
  const nda=ndaByUser[s.user_id];
  const ndaLabel=nda?'<span class="pill ok">Підписано ✓</span>':'<span class="pill warn">Не підписано</span>';
  const ndaAction=nda?'<a class="btn secondary compact" href="nda-record.html?id='+encodeURIComponent(s.user_id)+'">NDA</a>':'';
  const a=t[s.user_id];
  const theory=a?theoryLabel(a):(legacy[s.user_id]?legacy[s.user_id].score+'%':'—');
  const review=a&&a.status!=='in_progress'
    ?'<a class="btn secondary compact" href="theory-review.html?id='+encodeURIComponent(a.id)+'">'+(a.result_published_at?'Переглянути теорію':'Перевірити теорію')+'</a>'
    :'';
  const retry=a&&a.status!=='in_progress'
    ?'<button class="btn secondary compact retry-theory" data-user="'+s.user_id+'">Повтор теорії</button>'
    :'';
  const pa=p[s.user_id];
  const practicalReview=pa&&pa.status!=='in_progress'
    ?'<a class="btn secondary compact" href="practical-review.html?id='+encodeURIComponent(pa.id)+'">'+(pa.result_published_at?'Переглянути практику':'Перевірити практику')+'</a>'
    :'';
  const practicalRetry=pa&&pa.status!=='in_progress'
    ?'<button class="btn secondary compact retry-practical" data-user="'+s.user_id+'">Повтор практики</button>'
    :'';
  const practicalLabel=pa
    ?(pa.result_published_at?(pa.passed?'Складено':'Не складено'):(pa.status==='in_progress'?'Складає':'На перевірці'))
    :'—';
  const theoryOk=a?Boolean(a.result_published_at&&a.passed):Boolean(legacy[s.user_id]?.passed);
  const practicalOk=Boolean(pa?.result_published_at&&pa?.passed);
  const courseComplete=done===8&&theoryOk&&practicalOk;
  const moduleRows=Object.values(byMods[s.user_id]||{});
  const moduleGold=moduleRows.length===8&&moduleRows.every(x=>Number(x.score)>80);
  const theoryScoreValue=Number(a?.score??legacy[s.user_id]?.score??0);
  const goldEligible=courseComplete&&moduleGold&&theoryScoreValue>80&&Boolean(pa?.distinction);
  const certLabel=courseComplete?(goldEligible?'Золотий сертифікат':'Звичайний сертифікат'):'У процесі';
  /* Архівування закриває доступ, але лишає підписаний NDA і виданий
     сертифікат на місці. Видалення стирає їх разом з акаунтом, тому воно
     окремою кнопкою і з іншим підтвердженням. */
  const archived=Boolean(s.archived_at);
  const lifecycle=archived
    ? '<button class="btn secondary compact restore-student" data-user="'+s.user_id+'">Повернути з архіву</button>'
      +'<button class="btn danger compact wipe-student" data-user="'+s.user_id+'">Видалити</button>'
    : '<button class="btn secondary compact archive-student" data-user="'+s.user_id+'">В архів</button>';

  return '<tr'+(archived?' class="is-archived"':'')+'>'+
    '<td>'+(s.full_name||'—')+'</td>'+
    '<td>'+s.email+'</td>'+
    '<td>'+ndaLabel+'</td>'+
    '<td>'+done+'/8</td>'+
    '<td>'+theory+'</td>'+
    '<td>'+practicalLabel+'</td>'+
    '<td><span class="pill '+(courseComplete?(goldEligible?'gold':'ok'):'warn')+'">'+certLabel+'</span></td>'+
    '<td><div class="table-actions">'+ndaAction+review+retry+practicalReview+practicalRetry+lifecycle+'</div></td>'+
  '</tr>';
}).join(''):'<tr><td colspan="8">Студентів ще немає.</td></tr>';

document.querySelectorAll('.retry-practical').forEach(btn=>btn.onclick=async()=>{
  if(!confirm('Дозволити цьому студенту ще одну спробу практичного іспиту? Попередня спроба залишиться в історії.'))return;
  btn.disabled=true;
  const {error}=await client.rpc('pe_grant_practical_retry',{p_user_id:btn.dataset.user});
  if(error){alert('Не вдалося дозволити повтор практики: '+error.message);btn.disabled=false;return}
  btn.textContent='Повтор практики дозволено';
});

document.querySelectorAll('.retry-theory').forEach(btn=>btn.onclick=async()=>{
  if(!confirm('Дозволити цьому студенту ще одну спробу фінального теоретичного іспиту? Перша спроба залишиться в історії.'))return;
  btn.disabled=true;
  const {error}=await client.rpc('pe_grant_theory_retry',{p_user_id:btn.dataset.user});
  if(error){alert('Не вдалося дозволити повтор: '+error.message);btn.disabled=false;return}
  btn.textContent='Повтор дозволено';
});

/* ── архів і видалення ─────────────────────────────────────────────────
   Архівування зворотне: доступ закривається, записи лишаються. Видалення
   незворотне — воно стирає підписаний договір і виданий сертифікат разом
   з акаунтом, після чого посилання на перевірку сертифіката вже не
   відкриється. Тому перед видаленням адмінка питає в бази, що саме в
   цього студента є, показує список і вимагає ввести імʼя вручну. */
const fail=(e,fb)=>alert(window.PE_errorText?window.PE_errorText(e,fb):fb);

document.querySelectorAll('.archive-student').forEach(btn=>btn.onclick=async()=>{
  if(!confirm('Відправити студента в архів? Доступ до курсу закриється, '
             +'але підписаний договір і виданий сертифікат залишаться. '
             +'Повернути можна будь-коли.'))return;
  btn.disabled=true;
  const {error}=await client.rpc('pe_admin_archive_student',{p_user_id:btn.dataset.user});
  if(error){fail(error,'Не вдалося архівувати студента.');btn.disabled=false;return}
  location.reload();
});

document.querySelectorAll('.restore-student').forEach(btn=>btn.onclick=async()=>{
  btn.disabled=true;
  const {error}=await client.rpc('pe_admin_restore_student',{p_user_id:btn.dataset.user});
  if(error){fail(error,'Не вдалося повернути студента з архіву.');btn.disabled=false;return}
  location.reload();
});

const wipeDialog=document.getElementById('wipeDialog');
const wipeWho=document.getElementById('wipeWho');
const wipeList=document.getElementById('wipeList');
const wipeName=document.getElementById('wipeName');
const wipeMsg=document.getElementById('wipeMsg');
const wipeConfirm=document.getElementById('wipeConfirm');
let wipeTarget=null;

document.querySelectorAll('.wipe-student').forEach(btn=>btn.onclick=async()=>{
  btn.disabled=true;
  const {data,error}=await client.rpc('pe_admin_student_footprint',{p_user_id:btn.dataset.user});
  btn.disabled=false;
  if(error){fail(error,'Не вдалося прочитати дані студента.');return}
  const f=Array.isArray(data)?data[0]:data;
  wipeTarget=f;
  wipeWho.textContent='Акаунт «'+(f.full_name||f.email)+'» буде стерто повністю. '
                     +'Це неможливо скасувати.';
  const lost=[];
  if(f.nda)lost.push('підписаний договір NDA — з підписом, іменем і датою');
  if(f.certificate)lost.push('виданий сертифікат '+(f.certificate_no||'')
                            +' — посилання на його перевірку перестане працювати');
  if(f.modules)lost.push('результати модулів: '+f.modules);
  if(f.theory)lost.push('спроби теоретичного іспиту: '+f.theory);
  if(f.practical)lost.push('спроби практичного іспиту: '+f.practical);
  if(!lost.length)lost.push('жодних результатів — студент нічого не починав');
  wipeList.innerHTML=lost.map(x=>'<li>'+x+'</li>').join('');
  wipeName.value='';
  wipeMsg.style.display='none';
  wipeDialog.showModal();
});

if(wipeConfirm)wipeConfirm.onclick=async()=>{
  if(!wipeTarget)return;
  wipeConfirm.disabled=true;
  wipeMsg.style.display='none';
  const {error}=await client.rpc('pe_admin_delete_student',{
    p_user_id:wipeTarget.user_id,
    p_confirm_name:wipeName.value
  });
  wipeConfirm.disabled=false;
  if(error){
    const txt=String(error.message||'');
    wipeMsg.textContent=txt.includes('NAME_MISMATCH')
      ?'Імʼя не збігається з тим, що записане в профілі. Перевірте й спробуйте ще раз.'
      :(window.PE_errorText?window.PE_errorText(error,'Не вдалося видалити студента.')
                           :'Не вдалося видалити студента.');
    wipeMsg.style.display='';
    return;
  }
  wipeDialog.close();
  location.reload();
};

const errors=[];
if(attemptsResp.error)errors.push('теорія: '+attemptsResp.error.message);
if(practicalAttemptsResp.error)errors.push('практика: '+practicalAttemptsResp.error.message);
if(ndaResp.error)errors.push('NDA: '+ndaResp.error.message);
msg.textContent=errors.length?'Не вдалося завантажити частину іспитів — '+errors.join(' · '):'Адмін-доступ підтверджено.';
msg.className=errors.length?'message err':'message ok';
})();