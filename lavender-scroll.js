(() => {
  const BASE_ATLAS='https://cdn.creativeclaw.co/u/931444b3/images/7c245087-ee48-4375-b50b-9f78a1fc349b.webp';
  const FRAME_ATLAS='https://cdn.creativeclaw.co/u/931444b3/images/d49b89e2-eb07-418c-9912-c69e2cad3c9f.webp';
  const TEXT_ATLAS='https://cdn.creativeclaw.co/u/931444b3/images/99cd960e-670f-4e6a-86ba-9bc86d0c348d.webp';
  const DW=1536, DH=864, FRAME_COUNT=180, TEXT_COUNT=60;
  const style=document.createElement('style');
  style.textContent=`
  :root{--lav-s:1}
  .topbar{position:fixed!important;top:0;left:0;right:0;z-index:10000!important}
  .lavender-scroll-scene{position:relative;height:260vh;min-height:calc(100vh + 900px);background:#f5f1ff;overflow:visible}
  .lavender-sticky{position:sticky;top:0;height:100vh;z-index:8;pointer-events:none;overflow:hidden}
  .lavender-first-screen{position:relative;height:100vh;margin-top:-100vh;overflow:hidden;z-index:3;background:#f6f3ff}
  .lavender-scroll-space{height:160vh;background:linear-gradient(180deg,#f6f3ff 0%,#f3effc 100%)}
  .lavender-plane,.lavender-sticky-plane{position:absolute;left:50%;top:0;width:${DW}px;height:${DH}px;transform-origin:top center;transform:translateX(-50%) scale(var(--lav-s))}
  .lavender-base{position:absolute;inset:0;background-image:url('${BASE_ATLAS}');background-repeat:no-repeat;background-size:8192px 6144px;background-position:0 -864px}
  .lavender-fallback{position:absolute;left:760px;top:0;width:180px;height:200px;background-image:url('${FRAME_ATLAS}');background-repeat:no-repeat;background-size:2700px 2400px;background-position:0 0;transform-origin:top left;transform:scale(4.32);opacity:1;transition:opacity .12s linear}
  .lavender-canvas,.lavender-text-canvas{position:absolute;inset:0;width:${DW}px;height:${DH}px;display:block}
  .lavender-text-canvas{z-index:3}
  .lavender-first-screen::after{content:'';position:absolute;inset:0;pointer-events:none;box-shadow:inset 0 0 140px rgba(92,61,154,.06)}
  body.lavender-ready .hero,body.lavender-ready .brand-manifesto{display:none!important}
  @media(max-width:700px){.lavender-scroll-scene{height:220vh}.lavender-scroll-space{height:120vh}}
  @media(prefers-reduced-motion:reduce){.lavender-scroll-scene{height:100vh;min-height:100vh}.lavender-scroll-space{display:none}}
  `;
  document.head.appendChild(style);

  const hero=document.querySelector('main#top > .hero');
  if(!hero) return;
  const scene=document.createElement('section');
  scene.className='lavender-scroll-scene';
  scene.id='lavenderHero';
  scene.innerHTML=`<div class="lavender-sticky" aria-hidden="true"><div class="lavender-sticky-plane"><div class="lavender-fallback"></div><canvas class="lavender-canvas" width="${DW}" height="${DH}"></canvas></div></div><div class="lavender-first-screen" aria-label="More than judging"><div class="lavender-plane"><div class="lavender-base"></div><canvas class="lavender-text-canvas" width="${DW}" height="${DH}"></canvas></div></div><div class="lavender-scroll-space"></div>`;
  hero.parentNode.insertBefore(scene,hero);
  document.body.classList.add('lavender-ready');

  const lavCanvas=scene.querySelector('.lavender-canvas');
  const textCanvas=scene.querySelector('.lavender-text-canvas');
  const lavCtx=lavCanvas.getContext('2d',{alpha:true});
  const textCtx=textCanvas.getContext('2d',{alpha:true});
  const fallback=scene.querySelector('.lavender-fallback');
  const baseImg=new Image(); baseImg.decoding='async'; baseImg.crossOrigin='anonymous'; baseImg.src=BASE_ATLAS;
  const frameImg=new Image(); frameImg.decoding='async'; frameImg.crossOrigin='anonymous'; frameImg.src=FRAME_ATLAS;
  const textImg=new Image(); textImg.decoding='async'; textImg.crossOrigin='anonymous'; textImg.src=TEXT_ATLAS;
  let baseReady=false,framesReady=false,textReady=false,lastFrame=-1;

  function setScale(){
    const vw=window.innerWidth,vh=window.innerHeight;
    const s=vh>vw?Math.min(vw/DW,vh/DH):Math.max(vw/DW,vh/DH);
    document.documentElement.style.setProperty('--lav-s',String(s));
  }
  setScale();
  window.addEventListener('resize',()=>{setScale();renderFromScroll()},{passive:true});

  function drawLavender(frame){
    if(!framesReady) return;
    frame=Math.max(0,Math.min(FRAME_COUNT-1,frame|0));
    if(frame===lastFrame) return;
    lastFrame=frame;
    lavCtx.clearRect(0,0,DW,DH);
    const col=frame%15,row=Math.floor(frame/15),sx=col*180,sy=row*200;
    lavCtx.imageSmoothingEnabled=true;lavCtx.imageSmoothingQuality='high';
    lavCtx.drawImage(frameImg,sx,sy,180,200,760,0,776,864);
  }

  function drawExactText(){
    if(!baseReady) return;
    textCtx.clearRect(0,0,DW,DH);
    textCtx.imageSmoothingEnabled=true;textCtx.imageSmoothingQuality='high';
    textCtx.drawImage(baseImg,0,864,768,432,0,0,DW,DH);
  }

  function drawTextFrame(frame){
    if(!textReady) return;
    frame=Math.max(0,Math.min(TEXT_COUNT-1,frame|0));
    const col=frame%10,row=Math.floor(frame/10),sx=col*228,sy=row*128;
    textCtx.clearRect(0,0,DW,DH);
    textCtx.imageSmoothingEnabled=true;textCtx.imageSmoothingQuality='high';
    textCtx.drawImage(textImg,sx,sy,228,128,0,0,DW,DH);
  }

  function animateText(){
    if(!textReady) return;
    const start=performance.now(),dur=2600;
    const tick=now=>{
      const t=Math.min(1,(now-start)/dur);
      drawTextFrame(Math.floor(t*(TEXT_COUNT-1)));
      if(t<1) requestAnimationFrame(tick); else drawExactText();
    };
    requestAnimationFrame(tick);
  }

  function renderFromScroll(){
    if(!framesReady) return;
    const rect=scene.getBoundingClientRect(),total=Math.max(1,scene.offsetHeight-window.innerHeight);
    const p=Math.max(0,Math.min(1,-rect.top/total));
    drawLavender(Math.round(p*(FRAME_COUNT-1)));
  }

  let ticking=false;
  window.addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(()=>{renderFromScroll();ticking=false})}},{passive:true});

  baseImg.onload=()=>{
    baseReady=true;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches || !textReady) drawExactText();
  };
  textImg.onload=()=>{
    textReady=true;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) drawExactText(); else animateText();
  };
  frameImg.onload=()=>{
    framesReady=true;drawLavender(0);fallback.style.opacity='0';renderFromScroll();
  };
})();