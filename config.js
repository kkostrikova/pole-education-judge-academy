window.PE_CONFIG = {
  passScore: 80,
  reviewMode: true,
  finalExamOpen: false,
  finalExamUrl: "final-theory.html",
  theoryPassScore: 60,
  theoryDurationMinutes: 60,
  practicalExamUrl: "practical.html",
  practicalDurationMinutes: 30,
  lectureCourseUrl: "https://westudy.ua/en/PoleEducation/course/519be545-a825-4517-9f7d-a075b071b6e9",
  supabaseUrl: "https://mffjcqpyfcptwahpxeom.supabase.co",
  supabasePublishableKey: "sb_publishable_G69GdUkmDVVZcAVUhLT9Mw_pADiXZOs"
};

(()=>{
  const href='premium-global.css?v=20260913-premium1';
  if(!document.querySelector(`link[href^="premium-global.css"]`)){
    const l=document.createElement('link');
    l.rel='stylesheet';
    l.href=href;
    document.head.appendChild(l);
  }
})();
