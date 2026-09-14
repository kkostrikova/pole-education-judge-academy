(()=>{
  const init=()=>{
    const section=document.querySelector('.brand-manifesto');
    const script=section?.querySelector('.brand-manifesto-script');
    if(!section||!script) return;

    const text='More\nthan judging ♡';
    section.classList.add('is-typing');
    script.setAttribute('data-typed','');
    let i=0;
    const type=()=>{
      i+=1;
      script.setAttribute('data-typed',text.slice(0,i));
      if(i<text.length) setTimeout(type, i<5?115:78);
    };
    setTimeout(type,320);

    let raf=0;
    const move=(x,y)=>{
      cancelAnimationFrame(raf);
      raf=requestAnimationFrame(()=>{
        const r=section.getBoundingClientRect();
        const nx=((x-r.left)/r.width-.5);
        const ny=((y-r.top)/r.height-.5);
        section.style.setProperty('--lav-x',`${(nx*18).toFixed(1)}px`);
        section.style.setProperty('--lav-y',`${(ny*12).toFixed(1)}px`);
      });
    };
    section.addEventListener('pointermove',e=>move(e.clientX,e.clientY),{passive:true});
    section.addEventListener('pointerleave',()=>{
      section.style.setProperty('--lav-x','0px');
      section.style.setProperty('--lav-y','0px');
    });

    if(matchMedia('(pointer:coarse)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      let t=0;
      const float=()=>{
        t+=0.018;
        section.style.setProperty('--lav-x',`${Math.sin(t)*4}px`);
        section.style.setProperty('--lav-y',`${Math.cos(t*.8)*3}px`);
        requestAnimationFrame(float);
      };
      requestAnimationFrame(float);
    }
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true}); else init();
})();
