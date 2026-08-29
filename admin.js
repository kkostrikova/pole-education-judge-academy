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
  {data:certs}
]=await Promise.all([
  client.from('profiles').select('*').order('created_at',{ascending:false}),
  client.from('module_results').select('*'),
  client.rpc('pe_admin_theory_attempts'),
  client.from('theory_exam_results').select('*'),
  client.rpc('pe_admin_practical_attempts'),
  client.from('certifications').select('*')
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
const c=Object.fromEntries((certs||[]).map(x=>[x.user_id,x]));

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
  return '<tr>'+
    '<td>'+(s.full_name||'—')+'</td>'+
    '<td>'+s.email+'</td>'+
    '<td>'+done+'/8</td>'+
    '<td>'+theory+'</td>'+
    '<td>'+practicalLabel+'</td>'+
    '<td><span class="pill '+(courseComplete?(goldEligible?'gold':'ok'):'warn')+'">'+certLabel+'</span></td>'+
    '<td><div class="table-actions">'+review+retry+practicalReview+practicalRetry+'</div></td>'+
  '</tr>';
}).join(''):'<tr><td colspan="7">Студентів ще немає.</td></tr>';

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

const errors=[];
if(attemptsResp.error)errors.push('теорія: '+attemptsResp.error.message);
if(practicalAttemptsResp.error)errors.push('практика: '+practicalAttemptsResp.error.message);
msg.textContent=errors.length?'Не вдалося завантажити частину іспитів — '+errors.join(' · '):'Адмін-доступ підтверджено.';
msg.className=errors.length?'message err':'message ok';
})();