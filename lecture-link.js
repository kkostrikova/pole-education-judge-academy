(()=>{
  const cfg=window.PE_CONFIG||{};
  const url=cfg.lectureCourseUrl||'https://westudy.ua/en/PoleEducation/course/519be545-a825-4517-9f7d-a075b071b6e9';
  if(!url||document.querySelector('.pe-lecture-float'))return;
  const a=document.createElement('a');
  a.className='pe-lecture-float';
  a.href=url;
  a.target='_blank';
  a.rel='noopener';
  a.innerHTML='<span>▶</span><b>Лекції WeStudy</b><small>↗</small>';
  Object.assign(a.style,{
    position:'fixed',right:'18px',bottom:'18px',zIndex:'9999',
    display:'flex',alignItems:'center',gap:'8px',
    padding:'11px 14px',borderRadius:'999px',
    background:'linear-gradient(135deg,#8b5cf6,#6d4cc2)',color:'#fff',textDecoration:'none',
    font:'700 13px Inter,system-ui,Arial',
    boxShadow:'0 12px 28px rgba(109,76,194,.26)',border:'1px solid rgba(255,255,255,.42)'
  });
  const s=a.querySelector('small'); if(s)Object.assign(s.style,{opacity:'.82',fontSize:'11px'});
  document.body.appendChild(a);
})();