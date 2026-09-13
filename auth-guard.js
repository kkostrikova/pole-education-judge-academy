(()=>{
  const theme=document.createElement('link');
  theme.rel='stylesheet';
  theme.href='theme-purple.css?v=20260913-purple4';
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
      :root{--cream:#17131d!important;--card:#22182d!important;--ink:#fff!important;--muted:#b9aec8!important;--wine:#7b34ef!important;--pink:#914cff!important;--line:#49345d!important;--gold:#c5ff00!important;--dark:#120d18!important}
      html,body{background:#17131d!important;color:#fff!important}
      body{background-image:radial-gradient(circle at 88% 0%,rgba(123,52,239,.22),transparent 28%),linear-gradient(180deg,#17131d,#21152f 70%,#17131d)!important;background-attachment:fixed!important}
      .wrap{color:#fff!important}

      /* universal dark cards across modules 1–8 */
      .card,.validator,.protocol-paper,.protocol-col,.scenario,.quizq,.quiz-q,.quiz-question,.key,.tc,.vc,.criterion,.cat,.pen,.box,.sum,.duty,.stopcase,.casefile,.sort-zone,.freq-pool,.checklist label,.proto-table,.mapping-card,.submit-card,.example,.gloss,.deduct,.case,.summary>div{
        background:#22182d!important;border-color:#563a70!important;color:#f8f5fb!important;box-shadow:0 14px 34px rgba(0,0,0,.16)!important
      }
      .card{background:linear-gradient(180deg,#241a2f,#201629)!important}

      /* force readable text inside all content/test cards */
      .card h1,.card h2,.card h3,.card h4,.card strong,.card b,.card label,
      .quizq h1,.quizq h2,.quizq h3,.quizq h4,.quizq strong,.quizq b,.quizq label,.quizq span,
      .quiz-q h1,.quiz-q h2,.quiz-q h3,.quiz-q h4,.quiz-q strong,.quiz-q b,.quiz-q label,.quiz-q span,
      .quiz-question h1,.quiz-question h2,.quiz-question h3,.quiz-question h4,.quiz-question strong,.quiz-question b,.quiz-question label,.quiz-question span,
      .key strong,.criterion strong,.cat strong,.pen strong,.box strong,.sum strong,.duty strong,.stopcase strong,.example strong,.gloss strong,.deduct strong,.case strong,
      .protocol th,.protocol td,.proto-row,.proto-row button,.protocol-col h3,.scenario h3,.tc b,.vc label{
        color:#f8f5fb!important;opacity:1!important;visibility:visible!important
      }
      .card p,.lead,.small,.muted,.key p,.criterion p,.cat p,.pen p,.box p,.sum p,.duty p,.stopcase p,.example p,.gloss p,.deduct p,.scenario p,.quizq p,.quiz-q p,.quiz-question p{
        color:#c8bdd3!important;opacity:1!important
      }

      /* accents */
      .ey,.key .n,.key span,.criterion span,.cat span,.pen span,.duty .n,.stopcase .light,.step,.jc-kicker,.performance-no,.module-no{color:#a86cff!important}
      .back,.status strong,.main b,.core-main b,.sum strong,.timeline b,.protocol-paper-head h3,.points,.tc b,.module-link{color:#b47cff!important}

      .pill,.quicknav a,.nav a,.tab,.secondary-btn{background:#261b31!important;border-color:#684587!important;color:#eee7f5!important}
      .quicknav,.nav{background:rgba(23,19,29,.96)!important;border-color:#49305f!important}

      .main,.core-main{background:linear-gradient(135deg,#2a1c36,#322044)!important;border-color:#644382!important}
      .main b,.core-main b{color:#fff!important}
      .note,.callout{background:linear-gradient(135deg,#2b2032,#33263a)!important;border-left-color:#c5ff00!important;color:#f6f1fa!important}
      .note strong,.callout strong{color:#c5ff00!important}

      .primary-btn,.btn.wine,.primary,.tab.active,.protocol-tab.active{background:linear-gradient(135deg,#8f48ff,#6d22e4)!important;color:#fff!important;border-color:#8f48ff!important;box-shadow:0 10px 24px rgba(123,52,239,.34)!important}
      .btn.secondary,.secondary{background:#2b2035!important;color:#fff!important;border-color:#60437d!important}

      input,select,textarea,.opt,.quiz-opt,.answer,.choice,.stopchoices button,.count button{
        background:#1b1422!important;color:#f8f5fb!important;border-color:#5b3d72!important;opacity:1!important
      }
      .opt,.quiz-opt,.answer,.choice,.stopchoices button{color:#f8f5fb!important}
      input::placeholder,textarea::placeholder{color:#94869f!important}
      input[type=checkbox],input[type=radio],input[type=range]{accent-color:#c5ff00!important}

      .dark,.lab,.control,.challenge,.scene360,.photoexplorer,.sorter,.judge,.scenario-panel,.calc,.challenge-panel{
        background:radial-gradient(circle at 82% 0%,rgba(123,52,239,.35),transparent 32%),linear-gradient(145deg,#100b16,#1c1128 58%,#2a1550)!important;border-color:#5d337f!important;color:#fff!important;box-shadow:0 18px 46px rgba(0,0,0,.26)!important
      }
      .lab h1,.lab h2,.lab h3,.lab h4,.lab strong,.lab b,.lab label,
      .dark h1,.dark h2,.dark h3,.dark h4,.dark strong,.dark b,.dark label,
      .control h1,.control h2,.control h3,.control h4,.control strong,.control b,.control label,
      .challenge h1,.challenge h2,.challenge h3,.challenge h4,.challenge strong,.challenge b,.challenge label,
      .judge h1,.judge h2,.judge h3,.judge h4,.judge strong,.judge b,.judge label,.judge button,
      .scenario-panel h1,.scenario-panel h2,.scenario-panel h3,.scenario-panel strong,.scenario-panel b{
        color:#f8f5fb!important;opacity:1!important
      }
      .lab p,.dark p,.control p,.challenge p,.scene360 p,.photoexplorer>p,.judge p,.calc p,.scenario-panel p{color:#c9bfd5!important}
      .lab .ey,.dark .ey,.control .ey,.challenge .ey,.scene360 .ey,.photoexplorer .ey{color:#c5ff00!important}

      .case-tab,.scenario-tab,.jc-tab{background:#21162b!important;color:#eee7f5!important;border-color:#5e3f78!important}
      .case-tab.active,.scenario-tab.active,.jc-tab.active{background:#7b34ef!important;border-color:#a36cff!important;color:#fff!important}

      .protocol table{background:#21172b!important;color:#fff!important}
      .protocol th{background:#302042!important;color:#d8c7ea!important}
      .protocol td{color:#f8f5fb!important;border-color:#49365a!important}
      .protocol tr,.proto-row{border-color:#49365a!important}
      .protocol-paper-head{border-bottom-color:#7b34ef!important}
      .proto-head{background:#7b34ef!important;color:#fff!important}

      .result,.sort-result,.quiz-result,.total{background:#2a1d38!important;border-left-color:#7b34ef!important;color:#f3edf8!important}
      .ok,.result.pass{background:#253219!important;color:#c5ff00!important}
      .warn{background:#31273d!important;color:#eadcf4!important}
      .bad,.result.fail{background:#3a2028!important;color:#ff9bad!important}

      .progress i,.meter i,.route i.done{background:#c5ff00!important}
      .outcome strong,.finish strong,.total strong,.completion-mark.done{color:#c5ff00!important}

      @media(max-width:760px){
        .card,.validator,.protocol-paper,.protocol-col,.scenario,.quizq,.quiz-q,.quiz-question,.key,.tc,.vc,.criterion,.cat,.pen,.box,.sum,.duty,.stopcase,.casefile{box-shadow:none!important}
      }
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