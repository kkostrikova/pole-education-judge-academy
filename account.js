(async()=>{
const cfg=window.PE_CONFIG||{},client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey),msg=document.getElementById('accountMessage');
const {data:{session}}=await client.auth.getSession();
if(!session){location.href='auth.html';return}
const uid=session.user.id;
const ndaResp=await client.rpc('pe_nda_status');
if(!ndaResp.error){
  const nda=Array.isArray(ndaResp.data)?ndaResp.data[0]:ndaResp.data;
  if(nda?.required!==false&&!nda?.signed){location.replace('nda.html?next=account.html');return}
  if(nda?.signed){
    const box=document.getElementById('ndaAccountBox'),txt=document.getElementById('ndaAccountText');
    if(box)box.classList.remove('hidden');
    if(txt){
      const when=nda.signed_at?new Intl.DateTimeFormat('uk-UA',{dateStyle:'medium',timeStyle:'short'}).format(new Date(nda.signed_at)):'';
      txt.textContent=(nda.full_name||'')+(when?' · '+when:'')+' · '+(nda.version||'');
    }
  }
}
if(window.PE_flushLocalProgress){try{await window.PE_flushLocalProgress()}catch(_){}}

const [
  {data:profile,error:pe},
  {data:mods,error:me},
  newTheoryResp,
  {data:legacyTheory},
  practicalResp,
  {data:cert}
]=await Promise.all([
  client.from('profiles').select('*').eq('user_id',uid).single(),
  client.from('module_results').select('*').eq('user_id',uid).order('module_id').order('attempt'),
  client.rpc('pe_student_theory_result'),
  client.from('theory_exam_results').select('*').eq('user_id',uid).order('attempt',{ascending:false}).limit(1),
  client.rpc('pe_student_practical_result'),
  client.from('certifications').select('*').eq('user_id',uid).limit(1)
]);
if(pe||me){msg.textContent='Не вдалося завантажити частину даних. Спробуйте оновити сторінку.';msg.className='message err';return}

profileLine.textContent=[profile?.full_name,profile?.email,profile?.country].filter(Boolean).join(' · ');
if(profile?.role==='admin')adminLink.classList.remove('hidden');

const best={};
(mods||[]).forEach(r=>{if(!best[r.module_id]||r.score>best[r.module_id].score)best[r.module_id]=r});
const modulesPassedCount=Object.values(best).filter(x=>x.passed).length;
modulesDone.textContent=modulesPassedCount+'/8';
moduleBody.innerHTML=Object.keys(best).length
  ?Object.values(best).sort((a,b)=>a.module_id-b.module_id).map(r=>'<tr><td>Модуль '+r.module_id+'</td><td>'+r.score+'%</td><td>'+r.attempt+'</td><td><span class="pill '+(r.passed?'ok':'warn')+'">'+(r.passed?'Складено':'Не складено')+'</span></td></tr>').join('')
  :'<tr><td colspan="4">Поки немає збережених результатів.</td></tr>';

const theoryPayload=!newTheoryResp.error
  ?(Array.isArray(newTheoryResp.data)?newTheoryResp.data[0]:newTheoryResp.data)
  :null;
const theoryAttempt=theoryPayload?.exists?theoryPayload:null;
if(theoryAttempt){
  theoryScore.textContent=theoryAttempt.result_published
    ?theoryAttempt.score+'%'
    :theoryAttempt.status==='in_progress'
      ?'Складається'
      :'На перевірці';

  const box=document.getElementById('theoryResultBox');
  const title=document.getElementById('theoryResultTitle');
  const text=document.getElementById('theoryResultText');
  const badge=document.getElementById('theoryResultBadge');
  if(box){
    box.classList.remove('hidden');
    if(theoryAttempt.result_published){
      badge.textContent=theoryAttempt.score+'%';
      badge.className='pill '+(theoryAttempt.passed?'ok':'warn');
      title.textContent=theoryAttempt.passed?'Теоретичний іспит складено':'Теоретичний іспит не складено';
      text.textContent='Фінальний результат опубліковано адміністратором. Спроба №'+theoryAttempt.attempt_number+'.';
    }else{
      badge.textContent='На перевірці';
      badge.className='pill warn';
      title.textContent='Теоретичний іспит перевіряється';
      text.textContent='Після перевірки відкритих відповідей і натискання адміністратором «Надіслати результат» тут з’явиться фінальний відсоток.';
    }
  }
}else{
  theoryScore.textContent=legacyTheory?.[0]?legacyTheory[0].score+'%':'—';
}
const practicalPayload=!practicalResp.error?(Array.isArray(practicalResp.data)?practicalResp.data[0]:practicalResp.data):null;
const practicalAttempt=practicalPayload?.exists?practicalPayload:null;
if(practicalAttempt){
  practicalStatus.textContent=practicalAttempt.result_published
    ?(practicalAttempt.passed?'Складено':'Не складено')
    :practicalAttempt.status==='in_progress'?'Складається':'На перевірці';

  const pbox=document.getElementById('practicalResultBox');
  const ptitle=document.getElementById('practicalResultTitle');
  const ptext=document.getElementById('practicalResultText');
  const pbadge=document.getElementById('practicalResultBadge');
  const pcomment=document.getElementById('practicalAdminComment');
  if(pbox){
    pbox.classList.remove('hidden');
    if(practicalAttempt.result_published){
      pbadge.textContent=practicalAttempt.passed?'Складено':'Не складено';
      pbadge.className='pill '+(practicalAttempt.passed?'ok':'warn');
      ptitle.textContent=practicalAttempt.passed?'Практичний іспит складено':'Практичний іспит не складено';
      ptext.textContent='Результат опубліковано адміністратором. Спроба №'+practicalAttempt.attempt_number+'.';
      if(practicalAttempt.admin_comment){
        pcomment.textContent='Коментар адміністратора: '+practicalAttempt.admin_comment;
        pcomment.classList.remove('hidden');
      }else pcomment.classList.add('hidden');
    }else{
      pbadge.textContent='На перевірці';pbadge.className='pill warn';
      ptitle.textContent='Практичний іспит перевіряється';
      ptext.textContent='Адміністратори переглядають три заповнені протоколи. Після перевірки тут з’явиться статус «Складено» або «Не складено».';
      pcomment.classList.add('hidden');
    }
  }
}else practicalStatus.textContent='—';
const theoryPassedFinal=Boolean(theoryAttempt?.result_published&&theoryAttempt?.passed);
const practicalPassedFinal=Boolean(practicalAttempt?.result_published&&practicalAttempt?.passed);
const courseComplete=modulesPassedCount===8&&theoryPassedFinal&&practicalPassedFinal;
let issuedCertificate=null;
let certificatePayload=null;
if(courseComplete){
  const certResp=await client.rpc('pe_student_certificate');
  if(!certResp.error){
    certificatePayload=Array.isArray(certResp.data)?certResp.data[0]:certResp.data;
    if(certificatePayload?.eligible)issuedCertificate=certificatePayload;
  }
}
const certificateBtn=document.getElementById('certificateBtn');
const certificateNameBox=document.getElementById('certificateNameBox');
const certificateNameInput=document.getElementById('certificateNameInput');
const confirmCertificateNameBtn=document.getElementById('confirmCertificateNameBtn');
const certificateNameMessage=document.getElementById('certificateNameMessage');

if(issuedCertificate){
  certStatus.textContent=issuedCertificate.certificate_type==='gold'?'Золотий':'Сертифікат';
  if(certificateBtn){certificateBtn.classList.remove('hidden');certificateBtn.textContent=issuedCertificate.certificate_type==='gold'?'Відкрити золотий сертифікат':'Відкрити сертифікат';}
  if(certificateNameBox)certificateNameBox.classList.add('hidden');
}else if(courseComplete&&certificatePayload?.name_confirmation_required){
  certStatus.textContent='Підтвердьте ім’я';
  if(certificateBtn)certificateBtn.classList.add('hidden');
  if(certificateNameBox){
    certificateNameBox.classList.remove('hidden');
    certificateNameInput.value=certificatePayload.suggested_name||profile?.full_name||session.user.user_metadata?.full_name||session.user.user_metadata?.name||'';
  }
}else{
  certStatus.textContent=courseComplete?'Сертифікат готується':(cert?.[0]?.final_status||'У процесі');
  if(certificateBtn)certificateBtn.classList.add('hidden');
  if(certificateNameBox)certificateNameBox.classList.add('hidden');
}

if(confirmCertificateNameBtn){
  confirmCertificateNameBtn.onclick=async()=>{
    const value=(certificateNameInput.value||'').trim().replace(/\s+/g,' ');
    if(value.length<2){
      certificateNameMessage.textContent='Вкажіть ім’я так, як воно має бути надруковане на сертифікаті.';
      certificateNameMessage.className='message err';
      return;
    }
    if(!confirm('Підтвердити написання «'+value+'» для сертифіката? Після видачі сертифіката ім’я буде зафіксовано.'))return;
    confirmCertificateNameBtn.disabled=true;
    certificateNameMessage.textContent='Зберігаємо ім’я та формуємо сертифікат…';
    certificateNameMessage.className='message';
    const {error:nameErr}=await client.rpc('pe_confirm_certificate_name',{p_certificate_name:value});
    if(nameErr){
      certificateNameMessage.textContent='Не вдалося підтвердити ім’я: '+nameErr.message;
      certificateNameMessage.className='message err';
      confirmCertificateNameBtn.disabled=false;
      return;
    }
    const certResp=await client.rpc('pe_student_certificate');
    const payload=!certResp.error?(Array.isArray(certResp.data)?certResp.data[0]:certResp.data):null;
    if(certResp.error||!payload?.eligible){
      certificateNameMessage.textContent='Ім’я збережено, але сертифікат поки не сформовано. Оновіть сторінку або зверніться до адміністратора.';
      certificateNameMessage.className='message err';
      confirmCertificateNameBtn.disabled=false;
      return;
    }
    certificateNameMessage.textContent='Готово. Сертифікат сформовано.';
    certificateNameMessage.className='message ok';
    setTimeout(()=>location.reload(),450);
  };
}

const ctitle=document.getElementById('courseCompletionTitle');
const ctext=document.getElementById('courseCompletionText');
const cbadge=document.getElementById('courseCompletionBadge');
const csteps=document.getElementById('courseCompletionSteps');
if(ctitle&&ctext&&cbadge&&csteps){
  const items=[
    ['Модулі',modulesPassedCount===8,modulesPassedCount+'/8'],
    ['Теоретичний іспит',theoryPassedFinal,theoryPassedFinal?'Складено':'Очікується'],
    ['Практичний іспит',practicalPassedFinal,practicalPassedFinal?'Складено':'Очікується']
  ];
  csteps.innerHTML=items.map(x=>'<span class="pill '+(x[1]?'ok':'warn')+'">'+(x[1]?'✓ ':'')+x[0]+' · '+x[2]+'</span>').join('');
  if(courseComplete){
    if(certificatePayload?.name_confirmation_required&&!issuedCertificate){
      ctitle.textContent='Курс завершено — підтвердьте ім’я';
      ctext.textContent='Усі вимоги курсу виконані. Перед видачею сертифіката перевірте ПІБ нижче та підтвердьте точне написання.';
      cbadge.textContent='Потрібне підтвердження';cbadge.className='pill warn';
    }else{
      ctitle.textContent=issuedCertificate?.certificate_type==='gold'?'Курс завершено з відзнакою':'Курс успішно завершено';
      ctext.textContent=issuedCertificate?.certificate_type==='gold'
        ?'Усі вимоги виконані на високому рівні: модульні тести та фінальна теорія — понад 80%, практична частина відзначена адміністраторами. Вам видано золотий сертифікат.'
        :'Усі 8 модулів, теоретичний і практичний іспити успішно завершені. Вам доступний сертифікат Pole Education Judge Academy.';
      cbadge.textContent=issuedCertificate?.certificate_type==='gold'?'З відзнакою':'Завершено';cbadge.className='pill '+(issuedCertificate?.certificate_type==='gold'?'gold':'ok');
    }
  }else{
    ctitle.textContent='Навчання триває';
    ctext.textContent='Курс буде завершено автоматично, коли всі 8 модулів та обидві частини фінальної атестації матимуть статус «Складено».';
    cbadge.textContent='У процесі';cbadge.className='pill warn';
  }
}
msg.textContent='Дані кабінету захищені: ви бачите лише власні результати.';
msg.className='message ok';
logoutBtn.onclick=async()=>{await client.auth.signOut();location.href='index.html'};
})();