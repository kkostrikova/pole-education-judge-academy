(() => {
  const cfg=window.PE_CONFIG||{};
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  const login=document.getElementById('loginForm'), signup=document.getElementById('signupForm'), msg=document.getElementById('authMessage'), googleBtn=document.getElementById('googleAuthBtn');
  const params=new URLSearchParams(location.search),next=params.get('next');
  const safeNext=(next && /^[a-zA-Z0-9._-]+(?:[?#].*)?$/.test(next))?next:'account.html';
  const ndaNext='nda.html?next='+encodeURIComponent(safeNext);
  const tabs=[...document.querySelectorAll('.tab')];
  const setMsg=(text,type='')=>{msg.textContent=text;msg.className='message'+(type?' '+type:'')};
  const routeAfterAuth=async()=>{
    const resp=await client.rpc('pe_nda_status');
    if(!resp.error){
      const s=Array.isArray(resp.data)?resp.data[0]:resp.data;
      if(s?.required!==false&&!s?.signed){location.href=ndaNext;return}
    }
    location.href=safeNext;
  };
  tabs.forEach(t=>t.addEventListener('click',()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');const sign=t.dataset.tab==='signup';signup.classList.toggle('hidden',!sign);login.classList.toggle('hidden',sign);setMsg(sign?'Після реєстрації підтвердьте email за посиланням у листі.':'Для входу використовуйте підтверджений email.');}));
  googleBtn?.addEventListener('click',async()=>{
    googleBtn.disabled=true;setMsg('Відкриваємо Google…');
    const redirectTo=new URL(ndaNext,location.href).href;
    const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo,queryParams:{prompt:'select_account'}}});
    if(error){googleBtn.disabled=false;setMsg('Не вдалося увійти через Google: '+error.message,'err');}
  });
  login?.addEventListener('submit',async e=>{
    e.preventDefault();setMsg('Входимо…');
    const {error}=await client.auth.signInWithPassword({email:loginEmail.value.trim(),password:loginPassword.value});
    if(error)return setMsg(error.message,'err');
    await routeAfterAuth();
  });
  signup?.addEventListener('submit',async e=>{
    e.preventDefault();setMsg('Створюємо акаунт…');
    const {data,error}=await client.auth.signUp({
      email:signupEmail.value.trim(),
      password:signupPassword.value,
      options:{
        data:{full_name:signupName.value.trim(),country:signupCountry.value.trim()},
        emailRedirectTo:new URL(ndaNext,location.href).href
      }
    });
    if(error)return setMsg(error.message,'err');
    if(data.session){
      setMsg('Акаунт створено. Переходимо до договору…','ok');
      setTimeout(()=>location.href=ndaNext,500);
    }else setMsg('Готово. Перевірте пошту та підтвердьте email. Після підтвердження відкриється договір перед початком навчання.','ok');
  });
  client.auth.getSession().then(({data})=>{if(data.session)routeAfterAuth()});
})();