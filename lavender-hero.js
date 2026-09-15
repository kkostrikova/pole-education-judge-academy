/* Lavender hero — a still studio plate, live type over it.

   The frame sequence is gone: the hero is one photograph now, so what moves
   is the copy (it leaves faster than the scroll), the plate (a slow drift
   in), the header, and the petals, which answer the cursor. */
(() => {
  const scene = document.querySelector('.lav-scene');
  const bg = document.querySelector('.lav-bg');
  if (!scene || !bg) return;

  const narrow = window.matchMedia('(max-width: 900px)').matches;

  /* How far the hero has scrolled away — drives the depth and the header. */
  function progress() {
    const travel = scene.offsetHeight - window.innerHeight;
    if (travel <= 0) return 0;
    const y = -scene.getBoundingClientRect().top;
    return Math.min(1, Math.max(0, y / travel));
  }

  /* the header is transparent while the plate is behind it, solid after */
  const topbar = document.querySelector('.topbar');
  function header() {
    if (!topbar) return;
    topbar.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.92);
  }

  /* depth: the copy leaves ~35% faster than the scroll, fading as it goes,
     while the plate behind it drifts in slowly. */
  const copy = document.querySelector('.lav-copy');
  function parallax(p) {
    bg.style.setProperty('--lav-zoom', (1 + p * 0.07).toFixed(4));
    if (!copy) return;
    const vh = window.innerHeight;
    const t = Math.min(1, window.scrollY / vh);
    copy.style.setProperty('--lav-shift', (-t * vh * 0.35).toFixed(1) + 'px');
    copy.style.opacity = String(Math.max(0, 1 - t * 1.25));
  }

  function render() { parallax(progress()); header(); }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { render(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', render, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', render, { passive: true });
  render();

  /* ── drifting petals ──────────────────────────────────────
     A handful of soft shapes on their own slow paths, nudged aside by the
     pointer. Transform-only, so they never trigger layout. */
  (() => {
    const host = document.querySelector('.lav-petals');
    if (!host || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* the layer is the whole viewport now, not just the hero */
    const COUNT = narrow ? 9 : 18;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const petals = [];
    let W = host.clientWidth, H = host.clientHeight;
    const pointer = { x: -1e4, y: -1e4 };

    for (let i = 0; i < COUNT; i++) {
      const el = document.createElement('i');
      el.className = 'lav-petal' + (Math.random() < 0.5 ? ' two' : '');
      /* Weight matters more than count here. Faint and blurred, a petal
         stops being a petal and becomes a mark on the photograph — which is
         exactly what went wrong when I softened these. */
      /* taller than wide, the way a petal is */
      const size = rnd(13, 30);
      el.style.height = size + 'px';
      el.style.width = (size * rnd(.42, .62)) + 'px';
      el.style.opacity = String(rnd(.22, .55));
      el.style.filter = 'blur(' + rnd(0, 1.8).toFixed(1) + 'px)';
      host.appendChild(el);
      petals.push({
        el, size,
        x: rnd(0, 1), y: rnd(0, 1),
        vx: rnd(-.010, -.028), vy: rnd(.004, .016),
        spin: rnd(-26, 26), rot: rnd(0, 360),
        ox: 0, oy: 0
      });
    }

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
