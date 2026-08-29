(()=>{
  const style=document.createElement('style');
  style.textContent='html.pe-auth-checking body{visibility:hidden!important}';
  document.head.appendChild(style);
  document.documentElement.classList.add('pe-auth-checking');

  const cfg=window.PE_CONFIG||{};
  const show=()=>document.documentElement.classList.remove('pe-auth-checking');
  const goLogin=()=>{
    const next=location.pathname.split('/').pop()+location.search+location.hash;
    location.replace('auth.html?next='+encodeURIComponent(next));
  };

  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey){goLogin();return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  client.auth.getSession().then(({data})=>{
    if(!data?.session){goLogin();return}
    window.PE_CURRENT_SESSION=data.session;
    show();
  }).catch(goLogin);
})();