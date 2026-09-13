(()=>{
  const theme=document.createElement('link');
  theme.rel='stylesheet';
  theme.href='theme-purple.css?v=20260913-purple3';
  document.head.appendChild(theme);

  const style=document.createElement('style');
  style.textContent='html.pe-auth-checking body{visibility:hidden!important}';
  document.head.appendChild(style);
  document.documentElement.classList.add('pe-auth-checking');

  const applyFinalTheme=()=>{
    if(document.getElementById('pe-final-inline-theme')) return;
    const s=document.createElement('style');
    s.id='pe-final-inline-theme';
    s.textContent=`
      :root{--cream:#17131d!important;--card:#22182d!important;--ink:#fff!important;--muted:#b9aec8!important;--wine:#7b34ef!important;--pink:#914cff!important;--line:#3b2a4d!important;--gold:#c5ff00!important;--dark:#120d18!important}
      html,body{background:#17131d!important;color:#fff!important}
      body{background-image:radial-gradient(circle at 88% 0%,rgba(123,52,239,.22),transparent 28%),linear-gradient(180deg,#17131d,#21152f 70%,#17131d)!important;background-attachment:fixed!important}
      .wrap{color:#fff!important}
      .card,.validator,.protocol-paper,.protocol-col,.scenario,.quizq,.quiz-q,.quiz-question,.key,.tc,.vc,.criterion,.cat,.pen,.box,.sum,.duty,.stopcase,.casefile,.sort-zone,.freq-pool,.checklist label,.proto-table,.mapping-card,.submit-card{background:#22182d!important;border-color:#453257!important;color:#fff!important;box-shadow:0 14px 34px rgba(0,0,0,.18)!important}
      .card{background:linear-gradient(180deg,#241a2f,#201629)!important}
      .quizq b,.quizq strong,.quizq label,.quizq span,.quizq p,.quiz-q b,.quiz-q strong,.quiz-q label,.quiz-q span,.quiz-q p,.quiz-question b,.quiz-question strong,.quiz-question label,.quiz-question span,.quiz-question p{color:#f8f5fb!important;opacity:1!important;visibility:visible!important}
      .quizq label,.quiz-q label,.quiz-question label{display:block!important}
      .quizq,.quiz-q,.quiz-question{background:#21172b!important;border-color:#563a70!important}
      .quizq input[type=radio],.quiz-q input[type=radio],.quiz-question input[type=radio],.quizq input[type=checkbox],.quiz-q input[type=checkbox],.quiz-question input[type=checkbox]{accent-color:#c5ff00!important}
      .ey,.key .n,.key span,.criterion span,.cat span,.pen span,.duty .n,.stopcase .light,.step,.jc-kicker,.performance-no{color:#9b5cff!important}
      .back,.status strong,.main b,.core-main b,.case strong,.deduct strong,.sum strong,.timeline b,.protocol-paper-head h3,.points,.tc b,.module-link{color:#a86cff!important}
      .lead,.small,.key p,.criterion p,.cat p,.pen p,.box p,.scenario p,.duty p,.footer,.muted,.card p{color:#b9aec8!important}
      h1,h2,h3,strong,b{color:#fff}
      .pill,.quicknav a,.nav a,.tab,.secondary-btn{background:#261b31!important;border-color:#5a3c79!important;color:#ded5e8!important}
      .quicknav,.nav{background:rgba(23,19,29,.94)!important;border-color:#3d2a50!important}
      .main,.core-main{background:linear-gradient(135deg,#2a1c36,#322044)!important;border-color:#563a70!important}
      .note,.callout{background:linear-gradient(135deg,#2b2032,#33263a)!important;border-left-color:#c5ff00!important;color:#f6f1fa!important}
      .note strong,.callout strong{color:#c5ff00!important}
      .primary-btn,.btn.wine,.primary,.tab.active,.protocol-tab.active{background:linear-gradient(135deg,#8f48ff,#6d22e4)!important;color:#fff!important;border-color:#8f48ff!important;box-shadow:0 10px 24px rgba(123,52,239,.34)!important}
      .btn.secondary,.secondary{background:#2b2035!important;color:#fff!important;border-color:#60437d!important}
      input,select,textarea,.opt,.quiz-opt,.answer,.choice,.stopchoices button,.count button{background:#1b1422!important;color:#fff!important;border-color:#4c365f!important}
      input::placeholder,textarea::placeholder{color:#8f829d!important}
      input[type=checkbox],input[type=radio],input[type=range]{accent-color:#c5ff00!important}
      .dark,.lab,.control,.challenge,.scene360,.photoexplorer,.sorter,.judge,.scenario-panel,.calc,.challenge-panel{background:radial-gradient(circle at 82% 0%,rgba(123,52,239,.35),transparent 32%),linear-gradient(145deg,#100b16,#1c1128 58%,#2a1550)!important;border-color:#4d2a70!important;color:#fff!important;box-shadow:0 18px 46px rgba(0,0,0,.26)!important}
      .lab .ey,.dark .ey,.control .ey,.challenge .ey,.scene360 .ey,.photoexplorer .ey{color:#c5ff00!important}
      .lab p,.dark p,.control p,.challenge p,.scene360 p,.photoexplorer>p,.judge p,.calc p{color:#c9bfd5!important}
      .case-tab,.scenario-tab,.jc-tab{background:#21162b!important;color:#e9e1f2!important;border-color:#51366a!important}
      .case-tab.active,.scenario-tab.active,.jc-tab.active{background:#7b34ef!important;border-color:#9f66ff!important;color:#fff!important}
      .scene,.quote,.step{color:#f8f5fb!important}
      .scene p,.scene span{color:#c9bfd5!important}
      .progress i,.meter i,.route i.done{background:#c5ff00!important}
      .outcome strong,.finish strong,.total strong,.result.pass,.completion-mark.done{color:#c5ff00!important}
      @media(max-width:760px){.card,.validator,.protocol-paper,.protocol-col,.scenario,.quizq,.quiz-q,.quiz-question,.key,.tc,.vc,.criterion,.cat,.pen,.box,.sum,.duty,.stopcase,.casefile{box-shadow:none!important}}
    `;
    document.head.appendChild(s);
  };

  const cfg=window.PE_CONFIG||{};
  const show=()=>{applyFinalTheme();document.documentElement.classList.remove('pe-auth-checking')};
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