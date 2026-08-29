(async()=>{
const cfg=window.PE_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const msg=document.getElementById('certificateMessage');
const certEl=document.getElementById('certificate');
const printBtn=document.getElementById('printBtn');
const params=new URLSearchParams(location.search);
const preview=params.get('preview');
let currentLang=params.get('lang')==='en'?'en':'uk';

const formatDate=(value,lang)=>{
  if(!value)return '—';
  return new Intl.DateTimeFormat(lang==='en'?'en-GB':'uk-UA',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(value));
};
const showError=text=>{msg.textContent=text;msg.className='certificate-message err';certEl.classList.add('hidden');printBtn.disabled=true};

const {data:{session}}=await client.auth.getSession();
if(!session){location.href='auth.html?next='+encodeURIComponent('certificate.html'+location.search);return}

let cert=null;
if(preview==='standard'||preview==='gold'){
  const {data:profile}=await client.from('profiles').select('role,full_name').eq('user_id',session.user.id).single();
  if(profile?.role==='admin'){
    cert={
      eligible:true,certificate_type:preview,certificate_no:'PEJ-2026-PREVIEW',
      holder_name:profile.full_name||'Приклад сертифіката',
      holder_name_en:'Certificate Preview',english_version:true,
      course_title:'Суддівсько-організаційний курс',
      qualification:'пілон, повітряні кільця, повітряні полотна',
      duration_hours:10,issued_at:new Date().toISOString()
    };
  }
}

if(!cert){
  const {data,error}=await client.rpc('pe_student_certificate');
  if(error){showError('Система сертифікатів ще не активована або потребує оновлення SQL.');return}
  cert=Array.isArray(data)?data[0]:data;
}

if(!cert?.eligible){
  if(cert?.name_confirmation_required)showError('Перед видачею сертифіката підтвердьте ПІБ і потрібну мову сертифіката у кабінеті.');
  else showError('Сертифікат ще недоступний. Потрібно завершити 8 модулів і успішно скласти теоретичну та практичну частини.');
  return;
}

document.body.classList.toggle('gold',cert.certificate_type==='gold');
const languageSwitch=document.getElementById('languageSwitch');
if(cert.english_version&&cert.holder_name_en)languageSwitch.classList.remove('hidden');
else currentLang='uk';

function applyLanguage(lang){
  if(lang==='en'&&(!cert.english_version||!cert.holder_name_en))lang='uk';
  currentLang=lang;
  document.documentElement.lang=lang;
  document.getElementById('langUkBtn')?.classList.toggle('active',lang==='uk');
  document.getElementById('langEnBtn')?.classList.toggle('active',lang==='en');

  const gold=cert.certificate_type==='gold';
  if(lang==='en'){
    document.title='Certificate · Pole Education';
    document.getElementById('certificateTitle').textContent='CERTIFICATE';
    document.getElementById('logoOrbit').textContent='ONLINE SCHOOL';
    document.getElementById('watermarkTop').textContent='ONLINE SCHOOL';
    document.getElementById('confirmText').textContent='certifies that';
    document.getElementById('holderName').textContent=cert.holder_name_en||cert.holder_name;
    document.getElementById('courseTitle').textContent='has completed the Judging and Competition Organization Course';
    document.getElementById('examPhrase').textContent=gold?'and has successfully passed the examination with distinction':'and has passed the examination';
    document.getElementById('schoolText').textContent='from Pole Education online school';
    document.getElementById('qualificationLabel').textContent='Qualification:';
    document.getElementById('qualification').textContent='Pole, Aerial Hoop, Aerial Silks';
    document.getElementById('durationLabel').textContent='Course duration:';
    document.getElementById('hoursLabel').textContent='hours';
    document.getElementById('authorsTitle').textContent='AUTHORS';
    document.getElementById('certificateNoLabel').textContent='Certificate No.';
    document.getElementById('verifyLabel').textContent='Verify certificate';
  }else{
    document.title='Сертифікат · Pole Education';
    document.getElementById('certificateTitle').textContent='СЕРТИФІКАТ';
    document.getElementById('logoOrbit').textContent='ОНЛАЙН ШКОЛА';
    document.getElementById('watermarkTop').textContent='ОНЛАЙН ШКОЛА';
    document.getElementById('confirmText').textContent='підтверджує що';
    document.getElementById('holderName').textContent=cert.holder_name||'Студент';
    document.getElementById('courseTitle').textContent='прослухав(ла) Суддівсько-організаційний курс';
    document.getElementById('examPhrase').textContent=gold?'та успішно склав(ла) іспит з відзнакою':'та склав(ла) іспит';
    document.getElementById('schoolText').textContent='від онлайн школи Pole Education';
    document.getElementById('qualificationLabel').textContent='Кваліфікація:';
    document.getElementById('qualification').textContent=cert.qualification||'пілон, повітряні кільця, повітряні полотна';
    document.getElementById('durationLabel').textContent='Тривалість курсу:';
    document.getElementById('hoursLabel').textContent='годин';
    document.getElementById('authorsTitle').textContent='АВТОРИ/AUTHORS';
    document.getElementById('certificateNoLabel').textContent='№ сертифіката';
    document.getElementById('verifyLabel').textContent='Перевірити сертифікат';
  }
  document.getElementById('durationHours').textContent=cert.duration_hours||10;
  document.getElementById('certificateNo').textContent=cert.certificate_no||'—';
  document.getElementById('issueDate').textContent=formatDate(cert.issued_at,lang);
  const u=new URL(location.href);u.searchParams.set('lang',lang);history.replaceState(null,'',u);
}
document.getElementById('langUkBtn')?.addEventListener('click',()=>applyLanguage('uk'));
document.getElementById('langEnBtn')?.addEventListener('click',()=>applyLanguage('en'));
applyLanguage(currentLang);

const verifyUrl=new URL('certificate-verify.html',location.href);
verifyUrl.search='';verifyUrl.searchParams.set('no',cert.certificate_no);
document.getElementById('verifyLink').href=verifyUrl.href;
const qr=document.getElementById('qrCode');qr.innerHTML='';
if(window.QRCode)new QRCode(qr,{text:verifyUrl.href,width:116,height:116,correctLevel:QRCode.CorrectLevel.M});

msg.textContent=cert.certificate_type==='gold'?'Золотий сертифікат з відзнакою готовий.':'Сертифікат готовий.';
msg.className='certificate-message ok';certEl.classList.remove('hidden');printBtn.disabled=false;printBtn.onclick=()=>window.print();
})();