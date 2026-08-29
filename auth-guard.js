(()=>{
  const style=document.createElement('style');
  style.textContent='html.pe-auth-checking body{visibility:hidden!important}';
  document.head.appendChild(style);
  document.documentElement.classList.add('pe-auth-checking');

  const cfg=window.PE_CONFIG||{};
  const show=()=>document.documentElement.classList.remove('pe-auth-checking');
  const current=()=>location.pathname.split('/').pop()+location.search+location.hash;
  const goLogin=()=>location.replace('auth.html?next='+encodeURIComponent(current()));
  const goNda=()=>location.replace('nda.html?next='+encodeURIComponent(current()));

  if(!window.supabase||!cfg.supabaseUrl||!cfg.supabasePublishableKey){goLogin();return}
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  client.auth.getSession().then(async({data})=>{
    if(!data?.session){goLogin();return}
    window.PE_CURRENT_SESSION=data.session;
    const {data:nda,error}=await client.rpc('pe_nda_status');
    if(!error){
      const s=Array.isArray(nda)?nda[0]:nda;
      if(s?.required!==false&&!s?.signed){goNda();return}
      window.PE_NDA_STATUS=s;
    }
    show();
  }).catch(goLogin);
})();