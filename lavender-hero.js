/* Lavender hero — scroll-driven frame sequence.
   The clip was decoded once, offline, into 72 still WebP frames, so a scroll
   step is a single drawImage of an already-decoded bitmap: no seeking, no
   decoder catch-up, and the sequence plays as well backwards as forwards. */
(() => {
  /* 72 frames were exported; narrow screens take every second one so the
     payload halves while the same full-resolution stills are reused. */
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  const STEP = narrow ? 2 : 1;
  const N = Math.ceil(72 / STEP);
  const DIR = 'assets/hero/f/';
  const V = '?v=20260914-hero1';
  const scene = document.querySelector('.lav-scene');
  const canvas = document.querySelector('.lav-canvas');
  if (!scene || !canvas) return;

  const bg = canvas.parentElement;
  const ctx = canvas.getContext('2d', { alpha: false });
  const frames = new Array(N).fill(null);
  let ready = 0, current = -1, cw = 0, ch = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    cw = Math.round(w * dpr); ch = Math.round(h * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw; canvas.height = ch;
      current = -1;                       // force a redraw at the new size
    }
  }

  /* cover-fit, matching the poster <img>'s object-fit/object-position */
  function focus() {
    const v = parseFloat(getComputedStyle(bg).getPropertyValue('--focus'));
    return Number.isFinite(v) ? v / 100 : 0.5;
  }
  function paint(img) {
    if (!img || !cw) return;
    const s = Math.max(cw / img.width, ch / img.height);
    const w = img.width * s, h = img.height * s;
    ctx.drawImage(img, (cw - w) * focus(), (ch - h) / 2, w, h);
  }

  function nearest(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < N; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  function draw(i) {
    if (i === current) return;
    const img = nearest(i);
    if (!img) return;
    current = i;
    paint(img);
  }

  function progress() {
    const travel = scene.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    const y = -scene.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, y / travel));
  }

  /* the header is transparent while the lavender is behind it, solid after */
  const topbar = document.querySelector('.topbar');
  function header() {
    if (!topbar) return;
    const past = window.scrollY > window.innerHeight * 0.92;
    topbar.classList.toggle('is-solid', past);
  }

  function render() {
    draw(Math.round(progress() * (N - 1)));
    header();
  }

  /* ── loading ──────────────────────────────────────────────
     Frame 0 first so the canvas can take over from the poster
     immediately; the rest stream in behind it, four at a time. */
  function load(i) {
    return new Promise(res => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; ready++; res(); };
      img.onerror = res;
      img.src = DIR + String(i * STEP).padStart(3, '0') + '.webp' + V;
    });
  }

  async function loadAll() {
    await load(0);
    resize();
    draw(0);
    canvas.classList.add('is-live');
    render();
    const queue = [];
    for (let i = 1; i < N; i++) queue.push(i);
    const workers = new Array(4).fill(0).map(async () => {
      while (queue.length) {
        await load(queue.shift());
        render();
      }
    });
    await Promise.all(workers);
    render();
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { render(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => { resize(); render(); }, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => { resize(); render(); }, { passive: true });
  }

  resize();
  loadAll();
})();
