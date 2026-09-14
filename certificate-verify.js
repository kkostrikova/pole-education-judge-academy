(()=>{
const cfg=window.PE_CONFIG||{};
const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const form=document.getElementById('verifyForm'),input=document.getElementById('certificateInput'),box=document.getElementById('verifyResult');
const fmtDate=v=>v?new Intl.DateTimeFormat('uk-UA',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(v)):'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function verify(no){
  no=(no||'').trim();if(!no)return;
  box.className='result muted';box.textContent='Перевіряємо…';
  const {data,error}=await client.rpc('pe_verify_certificate',{p_certificate_no:no});
  if(error){box.className='result invalid';box.textContent='Не вдалося виконати перевірку.';return}
  const r=Array.isArray(data)?data[0]:data;
  if(!r?.valid){box.className='result invalid';box.innerHTML='<strong>Сертифікат не знайдено</strong>Перевірте номер або зверніться до Pole Education.';return}
  box.className='result valid';
  const englishName=r.english_version&&r.holder_name_en?'<div style="margin-top:4px"><b>English:</b> '+esc(r.holder_name_en)+'</div>':'';
  box.innerHTML='<div>✓ Дійсний сертифікат</div><strong>'+esc(r.holder_name)+'</strong>'+englishName+'<dl>'+
    '<dt>Номер</dt><dd>'+esc(r.certificate_no)+'</dd>'+
    '<dt>Тип</dt><dd>'+(r.certificate_type==='gold'?'Золотий · з відзнакою':'Звичайний')+'</dd>'+
    '<dt>Курс</dt><dd>'+esc(r.course_title)+'</dd>'+
    '<dt>Кваліфікація</dt><dd>'+esc(r.qualification)+'</dd>'+
    '<dt>Тривалість</dt><dd>'+esc(r.duration_hours)+' годин</dd>'+
    '<dt>Дата видачі</dt><dd>'+fmtDate(r.issued_at)+'</dd></dl>';
}
form.addEventListener('submit',e=>{e.preventDefault();verify(input.value)});
const no=new URLSearchParams(location.search).get('no');if(no){input.value=no;verify(no)}
})();