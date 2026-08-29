(async()=>{
const cfg=window.PE_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const msg=document.getElementById('adminMessage');

const {data:{session}}=await client.auth.getSession();
if(!session){location.href='auth.html';return}
const {data:me}=await client.from('profiles').select('*').eq('user_id',session.user.id).single();
if(me?.role!=='admin'){msg.textContent='Доступ заборонено. Ця сторінка доступна лише адміністраторам.';msg.className='message err';return}

const [
  {data:profiles,error:profilesError},
  {data:mods},
  attemptsResp,
  {data:legacyTheory},
  {data:practical},
  {data:certs}
]=await Promise.all([
  client.from('profiles').select('*').order('created_at',{ascending:false}),
  client.from('module_results').select('*'),
  client.from('theory_exam_attempts').select('*'),
  client.from('theory_exam_results').select('*'),
  client.from('practical_results').select('*'),
  client.from('certifications').select('*')
]);

if(profilesError){msg.textContent='Не вдалося завантажити студентів.';msg.className='message err';return}

const attempts=attemptsResp.error?[]:(attemptsResp.data||[]);
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
const p=latest(practical,'created_at');
const c=Object.fromEntries((certs||[]).map(x=>[x.user_id,x]));

studentCount.textContent=students.length;
activeCount.textContent=students.filter(s=>Object.values(byMods[s.user_id]||{}).some(x=>x.passed)).length;
theoryPassed.textContent=students.filter(s=>{
  const a=t[s.user_id];
  return a?a.result_published_at&&a.passed:legacy[s.user_id]?.passed;
}).length;
certPassed.textContent=students.filter(s=>c[s.user_id]?.final_status==='passed').length;

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
    ?'<a class="btn secondary compact" href="theory-review.html?id='+encodeURIComponent(a.id)+'">'+(a.result_published_at?'Переглянути':'Перевірити')+'</a>'
    :'';
  const retry=a&&a.status!=='in_progress'
    ?'<button class="btn secondary compact retry-theory" data-user="'+s.user_id+'">Дозволити повтор</button>'
    :'';
  return '<tr>'+
    '<td>'+(s.full_name||'—')+'</td>'+
    '<td>'+s.email+'</td>'+
    '<td>'+done+'/8</td>'+
    '<td>'+theory+'</td>'+
    '<td>'+(p[s.user_id]?.status||'—')+'</td>'+
    '<td><span class="pill '+(c[s.user_id]?.final_status==='passed'?'ok':'')+'">'+(c[s.user_id]?.final_status||'in progress')+'</span></td>'+
    '<td><div class="table-actions">'+review+retry+'</div></td>'+
  '</tr>';
}).join(''):'<tr><td colspan="7">Студентів ще немає.</td></tr>';

document.querySelectorAll('.retry-theory').forEach(btn=>btn.onclick=async()=>{
  if(!confirm('Дозволити цьому студенту ще одну спробу фінального теоретичного іспиту? Перша спроба залишиться в історії.'))return;
  btn.disabled=true;
  const {error}=await client.rpc('pe_grant_theory_retry',{p_user_id:btn.dataset.user});
  if(error){alert('Не вдалося дозволити повтор: '+error.message);btn.disabled=false;return}
  btn.textContent='Повтор дозволено';
});

msg.textContent=attemptsResp.error
  ?'Адмін-доступ підтверджено. Серверну логіку нового теоретичного іспиту ще потрібно активувати в Supabase.'
  :'Адмін-доступ підтверджено.';
msg.className=attemptsResp.error?'message':'message ok';
})();