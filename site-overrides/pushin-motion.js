/* Progressive, reference-style block reveals; no dependency on image loading. */
(() => {
 const reduce = matchMedia('(prefers-reduced-motion: reduce)');
 let observer, mutations;
 const selector = '.pushin-flow-heading, .pusheen-room-section>.reveal:first-child, .pusheen-room-section>div.mx-auto:first-child, .memes-hero, main h1, main h2, .pushin-home-market, .pushin-risk-card, .pushin-market-card, .pushin-flow-link, .pushin-venue-grid li, .pushin-roadmap-grid article, .meme-card, .pusheen-story-copy, .pusheen-room-section--runner>ul, .pushin-content-wrap>section';
 function mount() {
  observer?.disconnect(); mutations?.disconnect();
  document.querySelectorAll('[data-block-motion]').forEach(el => {el.removeAttribute('data-block-motion');el.classList.remove('pushin-block-visible');});
  if (reduce.matches || !('IntersectionObserver' in window) || /\/(admin|trade|connect|portfolio|analytics|basis)\.html$/.test(location.pathname)) return;
  const seen = new WeakSet();
  observer = new IntersectionObserver(entries => entries.forEach(({target:el,isIntersecting,boundingClientRect:r}) => {
   if (isIntersecting) {
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('pushin-block-visible')));
    observer.unobserve(el);
   }
  }), {threshold:.15,rootMargin:'0px 0px -40px 0px'});
  const register = () => {
   document.querySelectorAll(selector).forEach(el => {
    if(seen.has(el) || el.parentElement.closest(selector)) return;
    seen.add(el);
    const siblings = [...el.parentElement.children].filter(n=>n.matches(selector));
    el.style.setProperty('--block-delay', Math.min(Math.max(0,siblings.indexOf(el)),3)*(el.matches('.pushin-flow-link')?110:90)+'ms');
    el.setAttribute('data-block-motion','ready');
    observer.observe(el);
   });
   document.querySelectorAll('.pushin-side-cat,.pushin-flow-hub,.pusheen-hero-banner').forEach(el => el.setAttribute('data-pushin-floating','active'));
  };
  register();
  mutations = new MutationObserver(register);
  mutations.observe(document.querySelector('main') || document.body,{childList:true,subtree:true});
  document.documentElement.dataset.pushinMotion='earnly-blocks-v4';
 }
 function ready(){requestAnimationFrame(mount)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
 reduce.addEventListener('change',ready);
 window.addEventListener('pageshow',e=>{if(e.persisted)ready()});
 document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('pushin-motion-paused',document.hidden));
})();
