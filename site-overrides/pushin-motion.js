/* Small progressive motion layer: content stays visible if animation is unavailable. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let entrance, visibility, additions;
  const active = new Set();
  function stop() {
    entrance?.disconnect(); visibility?.disconnect(); additions?.disconnect();
    active.forEach(animation => animation.cancel()); active.clear();
    document.querySelectorAll('[data-pushin-floating]').forEach(el => el.removeAttribute('data-pushin-floating'));
  }
  function mount() {
    stop();
    if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate || document.querySelector('.pa-shell') || /\/(admin|trade|connect|portfolio|analytics|basis)\.html$/.test(location.pathname)) return;
    const targets = [...document.querySelectorAll('main h1, main h2, .prism-hero p, .pushin-preview-heading, .pushin-risk-card, .pushin-market-card, .pushin-flow-link, .pushin-venue-grid li, .pushin-roadmap-grid article, .meme-card')];
    entrance = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) {
          if (entry.boundingClientRect.bottom < 0 || entry.boundingClientRect.top > innerHeight) delete entry.target.dataset.pushinEntered;
          return;
        }
        const el = entry.target;
        if (el.dataset.pushinEntered || el.hidden) return;
        el.dataset.pushinEntered = 'true';
        const siblings = [...el.parentElement.children].filter(n => targets.includes(n));
        const delay = Math.min(Math.max(0, siblings.indexOf(el)), 3) * 110;
        const animation = el.animate([
          {opacity: 0, translate: '0 36px', filter: 'blur(5px)'},
          {opacity: 1, translate: '0 0', filter: 'blur(0)'}
        ], {duration: 950, delay, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards'});
        active.add(animation);
        animation.finished.then(() => active.delete(animation), () => active.delete(animation));
      });
    }, {threshold: .08, rootMargin: '0px 0px -24px 0px'});
    targets.forEach(el => entrance.observe(el));
    visibility = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.setAttribute('data-pushin-floating', entry.isIntersecting ? 'active' : 'paused');
    }), {rootMargin: '80px'});
    const observed = new WeakSet();
    const watchArtwork = () => document.querySelectorAll('.pushin-side-cat, .pushin-flow-hub, .pusheen-hero-banner').forEach(el => {
      if (!observed.has(el)) { observed.add(el); visibility.observe(el); }
    });
    watchArtwork();
    additions = new MutationObserver(watchArtwork);
    additions.observe(document.body, {childList: true, subtree: true});
  }
  // Start without waiting for images; observe artwork added by the gallery later.
  function ready() { requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(mount))); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, {once: true}); else ready();
  preference.addEventListener('change', ready);
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('pushin-motion-paused', document.hidden);
  });
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted) ready(); });
})();
