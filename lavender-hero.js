/* Lavender hero — scroll-driven frame sequence.
   The clip was decoded once, offline, into 72 still WebP frames, so a scroll
   step is a single drawImage of an already-decoded bitmap: no seeking, no
   decoder catch-up, and the sequence plays as well backwards as forwards. */
(() => {
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  /* 2.3 MB of stills is nothing on a cable and a lot on a phone plan. The
     connection decides how many of the 72 get fetched: every frame on a
     desktop, every second on a narrow screen, every fourth when the browser
     reports Data Saver or a slow link. The sequence is eased rather than
     stepped, so a thinner set reads as the same sweep, just softer. */
  const net = navigator.connection || {};
  const thrifty = Boolean(net.saveData) || /(^|-)[23]g$/.test(net.effectiveType || '');
  const STEP = thrifty ? 4 : (narrow ? 2 : 1);
  const N = Math.ceil(72 / STEP);
  const DIR = 'assets/hero/f/';
  const V = '?v=20260914-hero14';
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

  /* How far the hero has scrolled away — still drives the depth and the
     header, but no longer the frames. */
  function progress() {
    const travel = scene.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    const y = -scene.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, y / travel));
  }

  /* ── what moves the lavender ──────────────────────────────
     The pointer does, where there is one. A cursor sweeping the flowers
     reads far better than a long scroll that exists only to play frames,
     and it lets the page below start right after the hero. Touch screens
     have no cursor, so there the sequence breathes on its own. */
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let target = 0;      // 0..1, where the sequence wants to be
  let eased = 0;       // 0..1, where it actually is
  let idle = 0;        // drift phase for touch screens

  function pointerTo(e) {
    const r = scene.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) return;
    const x = (e.clientX - r.left) / Math.max(1, r.width);
    const y = (e.clientY - Math.max(0, r.top)) / Math.max(1, window.innerHeight);
    /* mostly horizontal, with a little vertical so the whole field responds */
    target = Math.min(1, Math.max(0, x * 0.78 + y * 0.22));
  }

  let raf = 0;
  function loop(now) {
    if (finePointer && !calm) {
      eased += (target - eased) * 0.12;          // trails the cursor, never snaps
    } else if (!calm) {
      idle += 0.0022;
      eased = (Math.sin(idle) + 1) / 2;          // slow there-and-back
    }
    draw(Math.round(eased * (N - 1)));
    raf = requestAnimationFrame(loop);
  }

  /* the header is transparent while the lavender is behind it, solid after */
  const topbar = document.querySelector('.topbar');
  function header() {
    if (!topbar) return;
    const past = window.scrollY > window.innerHeight * 0.92;
    topbar.classList.toggle('is-solid', past);
  }

  /* depth: the copy leaves ~35% faster than the scroll, fading as it goes,
     while the field behind it drifts in slowly. */
  const copy = document.querySelector('.lav-copy');
  function parallax(p) {
    bg.style.setProperty('--lav-zoom', (1 + p * 0.07).toFixed(4));
    if (!copy) return;
    const vh = window.innerHeight;
    const t = Math.min(1, window.scrollY / vh);
    /* only the shift is written here; the centring differs between the
       desktop stage and the narrow layout, so CSS composes the transform */
    copy.style.setProperty('--lav-shift', (-t * vh * 0.35).toFixed(1) + 'px');
    copy.style.opacity = String(Math.max(0, 1 - t * 1.25));
  }

  function render() {
    const p = progress();
    parallax(p);
    header();
  }

  /* ── loading ──────────────────────────────────────────────
     Frame 0 first so the canvas can take over from the poster
     immediately; the rest stream in behind it, three at a time. */
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
    if (!raf) raf = requestAnimationFrame(loop);
    /* The rest are not needed for the first paint, and while they are in
       flight they compete with the fonts, the module cards and everything
       below the hero. They wait for load, then for an idle moment. */
    await afterLoad();
    const queue = [];
    for (let i = 1; i < N; i++) queue.push(i);
    const workers = new Array(3).fill(0).map(async () => {
      while (queue.length) {
        await load(queue.shift());
        render();
      }
    });
    await Promise.all(workers);
    render();
  }

  function afterLoad() {
    return new Promise(res => {
      const idle = () => (window.requestIdleCallback
        ? requestIdleCallback(res, { timeout: 1200 })
        : setTimeout(res, 200));
      if (document.readyState === 'complete') idle();
      else window.addEventListener('load', idle, { once: true });
    });
  }

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { render(); ticking = false; });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  if (finePointer) {
    window.addEventListener('pointermove', pointerTo, { passive: true });
  }
  window.addEventListener('resize', () => { resize(); render(); }, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => { resize(); render(); }, { passive: true });
  }

  resize();
  loadAll();

  /* ── drifting petals ──────────────────────────────────────
     A handful of soft shapes on their own slow paths, nudged aside by the
     pointer. Transform-only, so they never trigger layout. */
  (() => {
    const host = document.querySelector('.lav-petals');
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const COUNT = narrow ? 8 : 16;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const petals = [];
    let W = host.clientWidth, H = host.clientHeight;
    const pointer = { x: -1e4, y: -1e4 };

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('i');
      el.className = 'lav-petal';
      const size = rnd(9, 26);
      el.style.width = size + 'px';
      el.style.height = (size * rnd(.5, .72)) + 'px';
      el.style.opacity = String(rnd(.16, .5));
      el.style.filter = 'blur(' + rnd(0, 2.4).toFixed(1) + 'px)';
      host.appendChild(el);
      petals.push({
        el, size,
        x: rnd(0, 1), y: rnd(0, 1),
        vx: rnd(-.010, -.028), vy: rnd(.004, .016),
        spin: rnd(-26, 26), rot: rnd(0, 360),
        ox: 0, oy: 0
      });
    }

    host.parentElement.style.pointerEvents = 'none';
    window.addEventListener('pointermove', e => {
      const r = host.getBoundingClientRect();
      pointer.x = (e.clientX - r.left) / r.width;
      pointer.y = (e.clientY - r.top) / r.height;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { pointer.x = pointer.y = -1e4; }, { passive: true });

    let last = performance.now();
    function tick(now) {
      const dt = Math.min(50, now - last) / 1000;
      last = now;
      if (W !== host.clientWidth || H !== host.clientHeight) { W = host.clientWidth; H = host.clientHeight; }
      for (const p of petals) {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < -.08) { p.x = 1.08; p.y = rnd(0, 1); }
        if (p.y > 1.08) { p.y = -.08; p.x = rnd(0, 1); }
        p.rot += p.spin * dt;

        /* pointer pushes petals aside, then they ease back to their path */
        const dx = p.x - pointer.x, dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 0.016) {
          const f = (1 - d2 / 0.016) * 0.10;
          p.ox += dx * f; p.oy += dy * f;
        }
        p.ox *= 0.94; p.oy *= 0.94;

        p.el.style.transform =
          'translate(' + ((p.x + p.ox) * W).toFixed(1) + 'px,' + ((p.y + p.oy) * H).toFixed(1) + 'px)' +
          ' rotate(' + p.rot.toFixed(1) + 'deg)';
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  /* ── counters on the rising panel ───────────────────────── */
  (() => {
    const nums = document.querySelectorAll('.lav-counts strong[data-count]');
    if (!nums.length) return;
    const run = el => {
      const target = Number(el.dataset.count) || 0;
      const dur = 900, t0 = performance.now();
      const step = now => {
        const t = Math.min(1, (now - t0) / dur);
        el.textContent = String(Math.round(target * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    if (!('IntersectionObserver' in window)) { nums.forEach(n => n.textContent = n.dataset.count); return; }
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    }, { threshold: .6 });
    nums.forEach(n => io.observe(n));
  })();
})();
