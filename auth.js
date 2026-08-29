(() => {
  const cfg=window.PE_CONFIG||{};
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  const login=document.getElementById('loginForm'), signup=document.getElementById('signupForm'), msg=document.getElementById('authMessage');
  const tabs=[...document.querySelectorAll('.tab')];
  const setMsg=(text,type='')=>{msg.textContent=text;msg.className='message'+(type?' '+type:'')};
  tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');const sign=t.dataset.tab==='signup';signup.classList.toggle('hidden',!sign);login.classList.toggle('hidden',sign);setMsg(sign?'Після реєстрації підтвердьте email за посиланням у листі.':'Для входу використовуйте підтверджений email.');}));
  login?.addEventListener('submit',async e=>{e.preventDefault();setMsg('Входимо…');const {error}=await client.auth.signInWithPassword({email:loginEmail.value.trim(),password:loginPassword.value});if(error)return setMsg(error.message,'err');location.href='account.html';});
  signup?.addEventListener('submit',async e=>{e.preventDefault();setMsg('Створюємо акаунт…');const {data,error}=await client.auth.signUp({email:signupEmail.value.trim(),password:signupPassword.value,options:{data:{full_name:signupName.value.trim(),country:signupCountry.value.trim()},emailRedirectTo:new URL('account.html',location.href).href}});if(error)return setMsg(error.message,'err');if(data.session){setMsg('Акаунт створено. Переходимо до кабінету…','ok');setTimeout(()=>location.href='account.html',500)}else setMsg('Готово. Перевірте пошту та підтвердьте email. Після підтвердження поверніться на платформу й увійдіть.','ok');});
  client.auth.getSession().then(({data})=>{if(data.session) location.href='account.html';});
})();