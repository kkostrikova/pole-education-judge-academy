(async()=>{
const cfg=window.PE_CONFIG||{},client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey),msg=document.getElementById('accountMessage');
const {data:{session}}=await client.auth.getSession();
if(!session){location.href='auth.html';return}
const uid=session.user.id;
if(window.PE_flushLocalProgress){try{await window.PE_flushLocalProgress()}catch(_){}}

const [
  {data:profile,error:pe},
  {data:mods,error:me},
  newTheoryResp,
  {data:legacyTheory},
  {data:practical},
  {data:cert}
]=await Promise.all([
  client.from('profiles').select('*').eq('user_id',uid).single(),
  client.from('module_results').select('*').eq('user_id',uid).order('module_id').order('attempt'),
  client.from('theory_exam_attempts').select('attempt_number,status,score,passed,result_published_at,created_at').eq('user_id',uid).order('attempt_number',{ascending:false}).limit(1),
  client.from('theory_exam_results').select('*').eq('user_id',uid).order('attempt',{ascending:false}).limit(1),
  client.from('practical_results').select('*').eq('user_id',uid).order('created_at',{ascending:false}).limit(1),
  client.from('certifications').select('*').eq('user_id',uid).limit(1)
]);
if(pe||me){msg.textContent='Не вдалося завантажити частину даних. Спробуйте оновити сторінку.';msg.className='message err';return}

profileLine.textContent=[profile?.full_name,profile?.email,profile?.country].filter(Boolean).join(' · ');
if(profile?.role==='admin')adminLink.classList.remove('hidden');

const best={};
(mods||[]).forEach(r=>{if(!best[r.module_id]||r.score>best[r.module_id].score)best[r.module_id]=r});
modulesDone.textContent=Object.values(best).filter(x=>x.passed).length+'/8';
moduleBody.innerHTML=Object.keys(best).length
  ?Object.values(best).sort((a,b)=>a.module_id-b.module_id).map(r=>'<tr><td>Модуль '+r.module_id+'</td><td>'+r.score+'%</td><td>'+r.attempt+'</td><td><span class="pill '+(r.passed?'ok':'warn')+'">'+(r.passed?'Складено':'Не складено')+'</span></td></tr>').join('')
  :'<tr><td colspan="4">Поки немає збережених результатів.</td></tr>';

const theoryAttempt=!newTheoryResp.error&&newTheoryResp.data?.[0]?newTheoryResp.data[0]:null;
if(theoryAttempt){
  theoryScore.textContent=theoryAttempt.result_published_at
    ?theoryAttempt.score+'%'
    :theoryAttempt.status==='in_progress'
      ?'Складається'
      :'На перевірці';
}else{
  theoryScore.textContent=legacyTheory?.[0]?legacyTheory[0].score+'%':'—';
}
practicalStatus.textContent=practical?.[0]?practical[0].status:'—';
certStatus.textContent=cert?.[0]?cert[0].final_status:'—';
msg.textContent='Дані кабінету захищені: ви бачите лише власні результати.';
msg.className='message ok';
logoutBtn.onclick=async()=>{await client.auth.signOut();location.href='index.html'};
})();