(async()=>{
const cfg=window.PE_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const msg=document.getElementById('certificateMessage');
const certEl=document.getElementById('certificate');
const printBtn=document.getElementById('printBtn');
const params=new URLSearchParams(location.search);
const preview=params.get('preview');

const fmtDate=value=>{
  if(!value)return '—';
  const d=new Date(value);
  return new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric'}).format(d);
};
const showError=text=>{msg.textContent=text;msg.className='certificate-message err';certEl.classList.add('hidden');printBtn.disabled=true};

const {data:{session}}=await client.auth.getSession();
if(!session){location.href='auth.html?next='+encodeURIComponent('certificate.html'+location.search);return}

let cert=null;
if(preview==='standard'||preview==='gold'){
  const {data:profile}=await client.from('profiles').select('role,full_name').eq('user_id',session.user.id).single();
  if(profile?.role==='admin'){
    cert={
      eligible:true,
      certificate_type:preview,
      certificate_no:'PEJ-2026-PREVIEW',
      holder_name:profile.full_name||'Приклад сертифіката',
      course_title:'Суддівсько-організаційний курс',
      qualification:'пілон, повітряні кільця, повітряні полотна',
      duration_hours:10,
      issued_at:new Date().toISOString()
    };
  }
}

if(!cert){
  const {data,error}=await client.rpc('pe_student_certificate');
  if(error){showError('Система сертифікатів ще не активована в Supabase. Запустіть supabase-certificates-patch.sql.');return}
  cert=Array.isArray(data)?data[0]:data;
}

if(!cert?.eligible){
  if(cert?.name_confirmation_required){
    showError('Перед видачею сертифіката підтвердьте написання свого ПІБ у кабінеті.');
  }else{
    showError('Сертифікат ще недоступний. Потрібно завершити 8 модулів і успішно скласти теоретичну та практичну частини.');
  }
  return;
}

document.body.classList.toggle('gold',cert.certificate_type==='gold');
document.getElementById('holderName').textContent=cert.holder_name||'Студент';
const courseDisplay=(cert.course_title||'Суддівсько-організаційний курс')==='Суддівсько-організаційний курс'?'Суддівсько-організаційного курсу':cert.course_title;
document.getElementById('courseTitle').textContent=courseDisplay;
document.getElementById('qualification').textContent=cert.qualification||'пілон, повітряні кільця, повітряні полотна';
document.getElementById('durationHours').textContent=cert.duration_hours||10;
document.getElementById('certificateNo').textContent=cert.certificate_no||'—';
document.getElementById('issueDate').textContent=fmtDate(cert.issued_at);
document.getElementById('examPhrase').textContent=cert.certificate_type==='gold'?'та успішне складання іспиту з відзнакою':'та складання іспиту';

const verifyUrl=new URL('certificate-verify.html',location.href);
verifyUrl.searchParams.set('no',cert.certificate_no);
const verifyLink=document.getElementById('verifyLink');
verifyLink.href=verifyUrl.href;
const qr=document.getElementById('qrCode');
qr.innerHTML='';
if(window.QRCode)new QRCode(qr,{text:verifyUrl.href,width:116,height:116,correctLevel:QRCode.CorrectLevel.M});

msg.textContent=cert.certificate_type==='gold'?'Золотий сертифікат з відзнакою готовий.':'Сертифікат готовий.';
msg.className='certificate-message ok';
certEl.classList.remove('hidden');
printBtn.disabled=false;
printBtn.onclick=()=>window.print();
})();