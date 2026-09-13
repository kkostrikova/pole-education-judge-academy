(() => {
  const DESIGN_W=1536, DESIGN_H=864;
  const scene=document.getElementById('lavenderHero');
  const canvas=document.getElementById('lavenderCanvas');
  const bg=document.getElementById('lavenderBg');
  const text=document.getElementById('lavenderText');
  if(!scene || !canvas || !window.PE_LAVENDER_ASSETS || !window.PE_LAVENDER_FRAMES?.length) return;

  const assets=window.PE_LAVENDER_ASSETS;
  const frameURLs=window.PE_LAVENDER_FRAMES;
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  canvas.width=910;
  canvas.height=512;

  const frames=new Array(frameURLs.length);
  let lastIndex=-1, raf=0;

  const fit=()=>{
    const scale=Math.max(window.innerWidth/DESIGN_W, window.innerHeight/DESIGN_H);
    document.documentElement.style.setProperty('--lav-scale', String(scale));
  };

  const loadImage=(src)=>new Promise((resolve,reject)=>{
    const im=new Image();
    im.decoding='async';
    im.onload=()=>resolve(im);
    im.onerror=reject;
    im.src=src;
  });

  const drawIndex=(idx)=>{
    const im=frames[idx];
    if(!im || idx===lastIndex) return;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(im,0,0,canvas.width,canvas.height);
    lastIndex=idx;
  };

  const update=()=>{
    raf=0;
    const rect=scene.getBoundingClientRect();
    const travel=Math.max(1, scene.offsetHeight-window.innerHeight);
    const passed=Math.min(Math.max(-rect.top,0),travel);
    const progress=passed/travel;
    drawIndex(Math.round(progress*(frameURLs.length-1)));
  };

  const schedule=()=>{if(!raf)raf=requestAnimationFrame(update)};

  const init=async()=>{
    fit();
    bg.src=assets.background;
    text.src=assets.text;
    frames[0]=await loadImage(frameURLs[0]);
    drawIndex(0);
    await Promise.allSettled([bg.decode?.()||Promise.resolve(),text.decode?.()||Promise.resolve()]);
    scene.classList.add('is-ready');
    schedule();
    for(let i=1;i<frameURLs.length;i++){
      try{frames[i]=await loadImage(frameURLs[i])}catch(_){}
    }
  };

  window.addEventListener('resize',()=>{fit();schedule()},{passive:true});
  window.addEventListener('scroll',schedule,{passive:true});
  init().catch(()=>{});
})();
