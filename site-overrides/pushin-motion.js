/* Small progressive motion layer: content stays visible if animation is unavailable. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let entrance, visibility;
  const active = new Set();
  function stop() {
    entrance?.disconnect(); visibility?.disconnect();
    active.forEach(animation => animation.cancel()); active.clear();
    document.querySelectorAll('[data-pushin-floating]').forEach(el => el.removeAttribute('data-pushin-floating'));
  }
  function mount() {
    stop();
    if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate || document.querySelector('.pa-shell') || /\/(admin|trade|connect|portfolio|analytics|basis)\.html$/.test(location.pathname)) return;
    const targets = [...document.querySelectorAll('main h1, main h2, .pushin-risk-card, .pushin-market-card, .pushin-flow-link, .pushin-venue-grid li, .pushin-roadmap-grid article, .meme-card')];
    entrance = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        entrance.unobserve(el);
        if (el.dataset.pushinEntered || el.hidden) return;
        el.dataset.pushinEntered = 'true';
        const siblings = [...el.parentElement.children].filter(n => targets.includes(n));
        const delay = Math.min(Math.max(0, siblings.indexOf(el)), 3) * 65;
        const animation = el.animate([
          {opacity: 0, translate: '0 20px', filter: 'blur(3px)'},
          {opacity: 1, translate: '0 0', filter: 'blur(0)'}
        ], {duration: 680, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards'});
        active.add(animation);
        animation.finished.then(() => active.delete(animation), () => active.delete(animation));
      });
    }, {threshold: .08, rootMargin: '0px 0px -24px 0px'});
    targets.forEach(el => entrance.observe(el));
    visibility = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.setAttribute('data-pushin-floating', entry.isIntersecting ? 'active' : 'paused');
    }), {rootMargin: '80px'});
    document.querySelectorAll('.pushin-side-cat, .pushin-flow-hub').forEach(el => visibility.observe(el));
  }
  // Run after the existing gallery has placed its decorative artwork.
  function ready() { requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(mount))); }
  if (document.readyState === 'complete') ready(); else window.addEventListener('load', ready, {once: true});
  preference.addEventListener('change', ready);
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('pushin-motion-paused', document.hidden);
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted) ready(); });
})();
