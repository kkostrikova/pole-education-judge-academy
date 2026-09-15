window.PE_CONFIG = {
  passScore: 80,
  reviewMode: false,
  finalExamOpen: false,
  finalExamUrl: "final-theory.html",
  theoryPassScore: 60,
  theoryDurationMinutes: 60,
  practicalExamUrl: "practical.html",
  practicalDurationMinutes: 30,
  lectureCourseUrl: "https://westudy.ua/PoleEducation/course/04332efd-86fe-42a1-beb1-fa4ab6f703bc",
  /* Live lesson room. Leave it empty and the button stays hidden.
     NOTE: this file is served to every visitor before any sign-in, so the
     address here is public even though the button is behind the NDA. Keep
     Zoom's waiting room on for this room. */
  zoomUrl: "https://ksu-ks-ua.zoom.us/j/82579877518?pwd=VXi9UhHaE3abGfpCRw9YyS7iaZHyhm.1",
  zoomNote: "Кімната відкрита постійно ↗",
  handbookUrl: "https://zenodo.org/records/15861201",
  supabaseUrl: "https://mffjcqpyfcptwahpxeom.supabase.co",
  supabasePublishableKey: "sb_publishable_G69GdUkmDVVZcAVUhLT9Mw_pADiXZOs"
};

(()=>{
  if(!document.getElementById('pe-google-fonts')){
    const pre1=document.createElement('link');pre1.rel='preconnect';pre1.href='https://fonts.googleapis.com';document.head.appendChild(pre1);
    const pre2=document.createElement('link');pre2.rel='preconnect';pre2.href='https://fonts.gstatic.com';pre2.crossOrigin='anonymous';document.head.appendChild(pre2);
    const f=document.createElement('link');f.rel='stylesheet';f.id='pe-google-fonts';f.href='https://fonts.googleapis.com/css2?family=Allura&family=Ms+Madi&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=Manrope:wght@400;500;600;700;800&display=swap';document.head.appendChild(f);
  }
  if(!document.getElementById('pe-font-system')){
    const s=document.createElement('style');s.id='pe-font-system';s.textContent=`html,body,button,input,select,textarea{font-family:'Manrope',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif!important}h1,h2,.hero h1,.section-head h2,.final-copy h2,.completion-copy h2,.lecture-hub h2,.start-card h1,.result-card h1{font-family:'Cormorant Garamond',Georgia,serif!important;letter-spacing:-.02em}.hero h1{font-weight:600!important;line-height:.94!important}.section-head h2,.final-copy h2,.completion-copy h2,.lecture-hub h2{font-weight:600!important}.brand-manifesto-script{font-family:'Allura',cursive!important;font-weight:400!important;letter-spacing:.015em!important;line-height:.95!important}`;document.head.appendChild(s);
  }
})();
