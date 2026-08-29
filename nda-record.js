(async()=>{
const cfg=window.PE_CONFIG||{},client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
const id=new URLSearchParams(location.search).get('id'),status=document.getElementById('recordStatus'),card=document.getElementById('recordCard'),msg=document.getElementById('recordMessage');
const {data:{session}}=await client.auth.getSession();if(!session){location.href='auth.html';return}
const {data:me}=await client.from('profiles').select('role').eq('user_id',session.user.id).maybeSingle();if(me?.role!=='admin'){status.textContent='Немає доступу';return}
if(!id){status.textContent='Не вказано студента';return}
const {data,error}=await client.rpc('pe_admin_nda_record',{p_user_id:id});
if(error){msg.textContent='Не вдалося завантажити NDA: '+error.message;msg.className='message err';msg.classList.remove('hidden');return}
const r=Array.isArray(data)?data[0]:data;
if(!r?.exists){status.textContent='Не підписано';return}
status.textContent='Підписано ✓';status.style.background='#e8f3ec';status.style.color='#2d6b45';
document.getElementById('recordName').textContent=r.full_name||'—';
document.getElementById('recordEmail').textContent=r.email||'—';
document.getElementById('recordVersion').textContent=r.agreement_version||'—';
document.getElementById('recordDate').textContent=r.signed_at?new Intl.DateTimeFormat('uk-UA',{dateStyle:'long',timeStyle:'short'}).format(new Date(r.signed_at)):'—';
document.getElementById('recordText').textContent=r.agreement_text||'';
document.getElementById('recordSignature').src=r.signature_data_url||'';
card.classList.remove('hidden');
})();