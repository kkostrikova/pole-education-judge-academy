/* Lavender hero — type on lavender, no photograph.

   The plate is gone (see lavender-hero.css for why), so nothing here zooms
   a picture any more. What moves is the copy, which leaves faster than the
   scroll, the header, and the petals, which answer the cursor. */
(() => {
  const scene = document.querySelector('.lav-scene');
  const bg = document.querySelector('.lav-bg');
  if (!scene || !bg) return;

  const narrow = window.matchMedia('(max-width: 900px)').matches;

  /* the header is transparent while the plate is behind it, solid after */
  const topbar = document.querySelector('.topbar');
  function header() {
    if (!topbar) return;
    topbar.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.92);
  }

  /* depth: the copy leaves ~35% faster than the scroll, fading as it goes,
     while the plate behind it drifts in slowly. */
  const copy = document.querySelector('.lav-copy');
  function parallax() {
    if (!copy) return;
    const vh = window.innerHeight;
    const t = Math.min(1, window.scrollY / vh);
    copy.style.setProperty('--lav-shift', (-t * vh * 0.35).toFixed(1) + 'px');
    copy.style.opacity = String(Math.max(0, 1 - t * 1.25));
  }

  function render() { parallax(); header(); }

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { render(); ticking = false; });
  }, { passive: true });
  window.addEventListener('resize', render, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', render, { passive: true });
  render();

  /* the signature writes itself the first time the band comes into view */
  (() => {
    const sign = document.querySelector('.pe-sign');
    if (!sign) return;
    if (!('IntersectionObserver' in window)) { sign.classList.add('is-in'); return; }
    const io = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) { sign.classList.add('is-in'); io.disconnect(); }
    }, { threshold: .35 });
    io.observe(sign);
  })();

})();
