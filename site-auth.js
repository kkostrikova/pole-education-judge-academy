(()=>{
  const cfg=window.PE_CONFIG||{};
  const a=document.getElementById('accountLink');
  const emit=session=>{window.PE_AUTH_STATE={signedIn:Boolean(session),session:session||null};window.dispatchEvent(new CustomEvent('pe-auth-ready',{detail:window.PE_AUTH_STATE}))};
  if(!window.supabase||!cfg.supabaseUrl){
    if(a){a.textContent='Увійти';a.href='auth.html'}
    emit(null);
    return;
  }
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  client.auth.getSession().then(({data})=>{
    const session=data?.session||null;
    if(a){
      if(session){a.textContent='Мій кабінет';a.href='account.html'}
      else{a.textContent='Увійти';a.href='auth.html'}
    }
    emit(session);
  }).catch(()=>emit(null));
})();