(()=>{
  const cfg=window.PE_CONFIG||{};
  const a=document.getElementById('accountLink');
  const emit=(session,ndaStatus=null)=>{
    const courseAccess=Boolean(session)&&(ndaStatus?.required===false||ndaStatus?.signed||ndaStatus===null);
    window.PE_AUTH_STATE={signedIn:Boolean(session),session:session||null,ndaStatus,courseAccess};
    window.dispatchEvent(new CustomEvent('pe-auth-ready',{detail:window.PE_AUTH_STATE}));
  };
  if(!window.supabase||!cfg.supabaseUrl){
    if(a){a.textContent='Увійти';a.href='auth.html'}
    emit(null,null);
    return;
  }
  const client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabasePublishableKey);
  client.auth.getSession().then(async({data})=>{
    const session=data?.session||null;
    let ndaStatus=null;
    if(session){
      const resp=await client.rpc('pe_nda_status');
      if(!resp.error)ndaStatus=Array.isArray(resp.data)?resp.data[0]:resp.data;
    }
    if(a){
      if(session&&ndaStatus?.required!==false&&!ndaStatus?.signed){a.textContent='Підписати NDA';a.href='nda.html?next=account.html'}
      else if(session){a.textContent='Мій кабінет';a.href='account.html'}
      else{a.textContent='Увійти';a.href='auth.html'}
    }
    emit(session,ndaStatus);
  }).catch(()=>emit(null,null));
})();