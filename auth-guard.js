(()=>{
  const theme=document.createElement('link');
  theme.rel='stylesheet';
  theme.href='lavender-ui.css?v=20260913-v1';
  document.head.appendChild(theme);

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
    /* Раніше помилка цього запиту просто пропускалась — і сторінка модуля
       показувалась людині, яка договору не підписувала. Збій звʼязку
       відчиняв двері замість того, щоб їх зачинити. Тепер одна повторна
       спроба на випадок коротенького обриву, а якщо й вона не вдалася —
       ведемо на договір. Там те саме питання задається ще раз і видно
       зрозуміле повідомлення, а не порожня сторінка. */
    let s=null;
    for(let attempt=0;attempt<2;attempt++){
      const {data:nda,error}=await client.rpc('pe_nda_status');
      if(!error){s=Array.isArray(nda)?nda[0]:nda;break}
      if(attempt===0)await new Promise(r=>setTimeout(r,700));
    }
    if(!s||(s.required!==false&&!s.signed)){goNda();return}
    window.PE_NDA_STATUS=s;
    show();
  }).catch(goLogin);
})();
