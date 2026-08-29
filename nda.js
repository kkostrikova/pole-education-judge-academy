(async()=>{
const cfg=window.PE_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const params=new URLSearchParams(location.search);
const rawNext=params.get('next')||'index.html';
const safeNext=/^[a-zA-Z0-9._-]+(?:[?#].*)?$/.test(rawNext)?rawNext:'index.html';
const statusEl=document.getElementById('ndaStatus');
const msg=document.getElementById('ndaMessage');
const signingCard=document.getElementById('signingCard');
const signedCard=document.getElementById('signedCard');
const signBtn=document.getElementById('signNdaBtn');
const consent=document.getElementById('ndaConsent');
const nameInput=document.getElementById('ndaFullName');
const canvas=document.getElementById('signatureCanvas');
const ctx=canvas.getContext('2d');
let hasSignature=false,drawing=false,last=null;

const {data:{session}}=await client.auth.getSession();
if(!session){location.replace('auth.html?next='+encodeURIComponent('nda.html?next='+encodeURIComponent(safeNext)));return}
document.getElementById('accountEmail').textContent=session.user.email||'—';
document.getElementById('continueBtn').href=safeNext;

const [statusResp,docResp,profileResp]=await Promise.all([
  client.rpc('pe_nda_status'),
  client.rpc('pe_nda_document'),
  client.from('profiles').select('role,full_name,email').eq('user_id',session.user.id).maybeSingle()
]);

if(statusResp.error||docResp.error){
  statusEl.textContent='Потрібне налаштування';
  msg.textContent='Система підписання NDA ще не активована. Запустіть supabase-nda-patch.sql у Supabase.';
  msg.className='message err';
  msg.classList.remove('hidden');
  signBtn.disabled=true;
  return;
}
const status=Array.isArray(statusResp.data)?statusResp.data[0]:statusResp.data;
const doc=Array.isArray(docResp.data)?docResp.data[0]:docResp.data;
document.getElementById('agreementVersion').textContent=doc?.version||'—';
document.getElementById('agreementText').textContent=doc?.text||'Не вдалося завантажити текст договору.';

if(status?.required===false){
  location.replace(safeNext);return;
}
if(status?.signed){
  statusEl.textContent='Підписано ✓';
  statusEl.style.background='#e8f3ec';statusEl.style.color='#2d6b45';
  signingCard.classList.add('hidden');signedCard.classList.remove('hidden');
  const date=status.signed_at?new Intl.DateTimeFormat('uk-UA',{dateStyle:'long',timeStyle:'short'}).format(new Date(status.signed_at)):'';
  document.getElementById('signedMeta').textContent=(status.full_name||'')+(date?' · '+date:'');
  return;
}
statusEl.textContent='Потрібен підпис';

const profile=profileResp.data||{};
nameInput.value=profile.full_name||session.user.user_metadata?.full_name||session.user.user_metadata?.name||'';

function resetCanvas(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#211b1e';ctx.lineWidth=4;ctx.lineCap='round';ctx.lineJoin='round';
  hasSignature=false;updateButton();
}
function pos(e){
  const r=canvas.getBoundingClientRect();
  return {x:(e.clientX-r.left)*(canvas.width/r.width),y:(e.clientY-r.top)*(canvas.height/r.height)};
}
canvas.addEventListener('pointerdown',e=>{drawing=true;last=pos(e);canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!drawing)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;hasSignature=true;updateButton();});
canvas.addEventListener('pointerup',()=>{drawing=false;last=null});
canvas.addEventListener('pointercancel',()=>{drawing=false;last=null});
document.getElementById('clearSignature').onclick=resetCanvas;
consent.addEventListener('change',updateButton);nameInput.addEventListener('input',updateButton);
function updateButton(){signBtn.disabled=!(consent.checked&&hasSignature&&nameInput.value.trim().length>=2)}
resetCanvas();

signBtn.onclick=async()=>{
  const fullName=nameInput.value.trim().replace(/\s+/g,' ');
  if(!consent.checked||!hasSignature||fullName.length<2)return;
  if(!confirm('Підписати договір від імені «'+fullName+'» та відкрити доступ до курсу?'))return;
  signBtn.disabled=true;msg.className='message';msg.classList.remove('hidden');msg.textContent='Зберігаємо підпис…';
  const signature=canvas.toDataURL('image/png');
  const {data,error}=await client.rpc('pe_sign_course_nda',{
    p_full_name:fullName,
    p_signature_data_url:signature,
    p_consent:true,
    p_user_agent:navigator.userAgent
  });
  if(error){msg.textContent='Не вдалося підписати договір: '+error.message;msg.className='message err';signBtn.disabled=false;return}
  const saved=Array.isArray(data)?data[0]:data;
  msg.textContent='Договір підписано. Доступ до курсу відкрито.';msg.className='message ok';
  statusEl.textContent='Підписано ✓';statusEl.style.background='#e8f3ec';statusEl.style.color='#2d6b45';
  setTimeout(()=>location.replace(safeNext),650);
};

document.getElementById('logoutBtn').onclick=async()=>{await client.auth.signOut();location.replace('index.html')};
})();