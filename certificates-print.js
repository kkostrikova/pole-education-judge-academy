/* Усі видані сертифікати на одній сторінці, для друку.
 *
 * Аркуш не малюється тут наново: сторінка завантажує certificate.html,
 * бере з неї готовий <article class="certificate"> і клонує його для
 * кожного сертифіката. Тому будь-яка зміна в самому аркуші — нове фото
 * автора, інший підпис, інша верстка — одразу потрапляє і сюди, і
 * розходження між особистим сертифікатом студента та надрукованим
 * неможливе за побудовою.
 *
 * Важливо розуміти, кого тут видно. Запис про сертифікат створюється тоді,
 * коли студентка сама вперше відкриває свій сертифікат. Хто ще цього не
 * робив — сертифіката в базі не має, і надрукувати його нема з чого. Такі
 * люди перелічені окремо вгорі сторінки.
 */
(async()=>{
const cfg=window.PE_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const msg=document.getElementById('printMessage');
const sheets=document.getElementById('sheets');
const missingBox=document.getElementById('missingBox');
const printAllBtn=document.getElementById('printAllBtn');
const pdfAllBtn=document.getElementById('pdfAllBtn');
const countEl=document.getElementById('printCount');
const errText=err=>window.PE_errorText?window.PE_errorText(err):'Не вдалося виконати дію.';
const fail=text=>{msg.textContent=text;msg.className='certificate-message err'};

const esc=s=>String(s??'');
const formatDate=(value,lang)=>{
  if(!value)return '—';
  const opts=lang==='en'?{day:'numeric',month:'long',year:'numeric'}:{day:'2-digit',month:'2-digit',year:'numeric'};
  return new Intl.DateTimeFormat(lang==='en'?'en-GB':'uk-UA',opts).format(new Date(value));
};

try{
const {data:{session}}=await client.auth.getSession();
if(!session){location.href='auth.html?next='+encodeURIComponent('certificates-print.html');return}
const {data:me,error:meErr}=await client.from('profiles').select('role').eq('user_id',session.user.id).single();
if(meErr){fail('Не вдалося перевірити права: '+errText(meErr));return}
if(me?.role!=='admin'){fail('Ця сторінка доступна лише адміністраторам курсу.');return}

/* Один шаблон аркуша на всіх — узятий із самої сторінки сертифіката. */
const page=await fetch('certificate.html',{cache:'no-cache'});
if(!page.ok){fail('Не вдалося завантажити шаблон сертифіката.');return}
const tpl=new DOMParser().parseFromString(await page.text(),'text/html').querySelector('.certificate');
if(!tpl){fail('У шаблоні сертифіката не знайдено аркуша.');return}

/* Через функцію, а не прямим читанням таблиці: ролі authenticated ніколи
   не видавали дозволу на issued_certificates, і запит із браузера падав із
   «permission denied». Решта сайту так само ходить сюди через функції. */
const {data:payload,error:certErr}=await client.rpc('pe_admin_certificates');
if(certErr){
  /* Доки патч не запущено, функції в базі немає. Загальне «запустіть
     SQL-патч» не каже який — а файл тут рівно один. */
  const raw=[certErr.message,certErr.code,certErr.details,certErr.hint].filter(Boolean).join(' ');
  fail(/PGRST202|42883|could not find the function|does not exist/i.test(raw)
    ? 'Список сертифікатів ще не підключено до бази. Запустіть у Supabase → SQL Editor файл supabase-certificates-print-patch.sql, потім оновіть цю сторінку.'
    : 'Не вдалося завантажити сертифікати: '+errText(certErr));
  return;
}
const bundle=Array.isArray(payload)?payload[0]:payload;
const certs=bundle?.certificates||[];
const without=bundle?.without_certificate||[];
if(!certs||!certs.length){
  msg.textContent='Виданих сертифікатів ще немає. Сертифікат створюється тоді, коли студентка вперше відкриває його у своєму кабінеті.';
  msg.className='certificate-message';
  return;
}

const verifyBase=new URL('certificate-verify.html',location.href);

function buildSheet(cert,lang){
  const el=tpl.cloneNode(true);
  el.classList.remove('hidden');
  el.removeAttribute('id');
  const pick=id=>el.querySelector('#'+id);
  const put=(id,value)=>{const n=pick(id);if(n)n.textContent=value};

  const gold=cert.certificate_type==='gold';
  const attendance=cert.certificate_type==='attendance';
  pick('qualificationLine')?.classList.toggle('hidden',attendance);

  if(lang==='en'){
    put('certificateTitle','CERTIFICATE');
    put('confirmText','certifies that');
    put('holderName',cert.holder_name_en||cert.holder_name);
    put('courseTitle',attendance?'has attended the Judging and Competition Organization Course':'has completed the Judging and Competition Organization Course');
    put('examPhrase',attendance?'Certificate of course attendance':gold?'and has successfully passed the examination with distinction':'and has passed the examination');
    put('schoolText','from Pole Education online school');
    put('qualificationLabel','Qualification:');
    put('qualification','Pole, Aerial Hoop, Aerial Silks');
    put('durationLabel','Course duration:');
    put('hoursLabel','hours');
    put('authorsTitle','AUTHORS');
    put('certificateNoLabel','Certificate No.');
    put('verifyLabel','Verify certificate');
    put('authorLana','Svitlana Sova');
    put('authorKateryna','Kateryna Kostrikova');
  }else{
    put('certificateTitle','СЕРТИФІКАТ');
    put('confirmText','підтверджує що');
    put('holderName',cert.holder_name||'Студент');
    put('courseTitle','прослухав(ла) Суддівсько-організаційний курс');
    put('examPhrase',attendance?'Сертифікат про проходження курсу':gold?'та успішно склав(ла) іспит з відзнакою':'та склав(ла) іспит');
    put('schoolText','від онлайн школи Pole Education');
    put('qualificationLabel','Кваліфікація:');
    put('qualification',cert.qualification||'пілон, повітряні кільця, повітряні полотна');
    put('durationLabel','Тривалість курсу:');
    put('hoursLabel','годин');
    put('authorsTitle','АВТОРИ/AUTHORS');
    put('certificateNoLabel','№ сертифіката');
    put('verifyLabel','Перевірити сертифікат');
    put('authorLana','Світлана Сова');
    put('authorKateryna','Катерина Кострікова');
  }
  put('durationHours',cert.duration_hours||10);
  put('certificateNo',cert.certificate_no||'—');
  put('issueDate',formatDate(cert.issued_at,lang));

  const url=new URL(verifyBase.href);url.search='';url.searchParams.set('no',cert.certificate_no);
  const link=pick('verifyLink');if(link)link.href=url.href;
  const qr=pick('qrCode');
  if(qr){qr.innerHTML='';if(window.QRCode)new QRCode(qr,{text:url.href,width:116,height:116,correctLevel:QRCode.CorrectLevel.M})}

  /* Той самий id не може повторюватись на сторінці двадцять разів. */
  el.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
  if(gold)el.classList.add('gold-sheet');
  return el;
}

const typeName=t=>t==='gold'?'золотий':t==='attendance'?'про проходження курсу':'звичайний';
const built=[];

certs.forEach(cert=>{
  const langs=cert.english_version&&cert.holder_name_en?['uk','en']:['uk'];
  langs.forEach(lang=>{
    const wrap=document.createElement('section');
    wrap.className='sheet-wrap';
    const label=document.createElement('div');
    label.className='sheet-label';
    label.innerHTML='<strong>'+esc(cert.holder_name)+'</strong><span>'+esc(cert.certificate_no)
      +' · '+typeName(cert.certificate_type)+' · '+(lang==='en'?'англійською':'українською')+'</span>';
    const sheet=buildSheet(cert,lang);
    wrap.append(label,sheet);
    sheets.appendChild(wrap);
    built.push({cert,lang,sheet});
  });
});

/* Хто сертифіката ще не має — список рахує сама функція в базі. */
if(without.length){
  missingBox.classList.remove('hidden');
  missingBox.innerHTML='<strong>Без сертифіката: '+without.length+'</strong>'
    +'Сертифікат створюється тоді, коли студентка вперше відкриває його у своєму кабінеті. Ці люди цього ще не робили, тож друкувати для них поки нема чого.'
    +'<ul>'+without.map(p=>'<li>'+esc(p.full_name||p.email||p.user_id)+'</li>').join('')+'</ul>';
}

msg.classList.add('hidden');
countEl.textContent='Аркушів: '+built.length+' · сертифікатів: '+certs.length;
printAllBtn.disabled=false;
pdfAllBtn.disabled=false;
printAllBtn.onclick=()=>window.print();

const safeName=s=>String(s||'certificate').replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'');
pdfAllBtn.onclick=async()=>{
  if(!window.PE_savePdf){fail('Збірка PDF недоступна — скористайтесь кнопкою «Друкувати всі».');return}
  pdfAllBtn.disabled=true;printAllBtn.disabled=true;
  for(let i=0;i<built.length;i++){
    const {cert,lang,sheet}=built[i];
    countEl.textContent='Готую PDF '+(i+1)+' з '+built.length+'…';
    try{
      await window.PE_savePdf(sheet,safeName(cert.holder_name)+'-'+cert.certificate_no+(lang==='en'?'-en':'')+'.pdf');
    }catch(err){console.warn('[PE] PDF не зібрався',cert.certificate_no,err)}
    /* Браузер не встигає зберегти десяток файлів поспіль без паузи. */
    await new Promise(r=>setTimeout(r,650));
  }
  countEl.textContent='Готово: '+built.length+' PDF. Аркушів: '+built.length+' · сертифікатів: '+certs.length;
  pdfAllBtn.disabled=false;printAllBtn.disabled=false;
};
}catch(err){
  fail('Не вдалося підготувати сертифікати: '+errText(err));
}
})();
