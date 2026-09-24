(function () {
  'use strict';
  function start() {
    const body = document.body;
    if (body.classList.contains('pusheen-branded-page') && !body.classList.contains('pusheen-page--home') && !body.classList.contains('pusheen-workspace-page')) {
      let scene = /pusheen-page--(docs|roadmap|tokenomics)/.test(body.className) ? 'docs-clean-v3.webp' : /pusheen-page--(connect|portfolio)/.test(body.className) ? 'settlement-clean-v2.webp' : 'analysis-cutout.png';
      const artwork = document.createElement('div');
      artwork.className = 'pushin-page-cats';
      artwork.setAttribute('aria-hidden','true');
      artwork.style.setProperty('--pushin-side-image', `url("/brand/pusheen-${scene}")`);
      artwork.innerHTML = '<span class="pushin-side-cat pushin-side-cat--left"></span><span class="pushin-side-cat pushin-side-cat--right"></span>';
      const main = document.querySelector('main');
      if (main) main.insertAdjacentElement('afterend',artwork);
    }

    // Remove the decorative chain number from compact network badges only.
    const cleanNetworkBadges = () => {
      document.querySelectorAll('span, strong, small').forEach(node => {
        if (node.children.length || !/^4663(?:0)?$/.test(node.textContent.trim())) return;
        const parent = node.parentElement;
        if (parent && parent.textContent.length < 100 && parent.textContent.includes('Robinhood Chain')) node.remove();
      });
    };
    cleanNetworkBadges();
    window.addEventListener('load', cleanNetworkBadges, {once:true});

    const api=window.PushinMarketPreview;
    const panel=document.getElementById('pushin-home-market');
    if(panel&&api&&!panel.hasAttribute("data-reference-market")){
      let selected='c-vix-30d';
      panel.innerHTML='<div class="pushin-preview-tabs" role="tablist" aria-label="Market">'+api.markets.map(m=>'<button role="tab" data-preview-market="'+m.slug+'" aria-selected="'+(m.slug===selected)+'">'+m.short+'</button>').join('')+'</div><div class="pushin-preview-heading"><div><h3 id="pushin-preview-name"></h3><span>Generated practice data</span></div><strong id="pushin-preview-price"></strong><a id="pushin-preview-open" href="/trade.html">Open terminal ↗</a></div><div id="pushin-preview-chart" class="pa-chart"></div>';
      const render=()=>{const m=api.snapshot(selected);document.getElementById('pushin-preview-name').textContent=m.short;document.getElementById('pushin-preview-price').textContent=m.price.toFixed(2)+(selected==='c-vix-30d'?'':' bps');document.getElementById('pushin-preview-open').href='/trade.html?market='+selected;document.getElementById('pushin-preview-chart').innerHTML=api.chart(selected);};
      const buttons=[...panel.querySelectorAll('[data-preview-market]')];
      function select(b){selected=b.dataset.previewMarket;buttons.forEach(x=>{const active=x===b;x.setAttribute('aria-selected',String(active));x.tabIndex=active?0:-1;});render();}
      buttons.forEach((b,i)=>{b.onclick=()=>select(b);b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length;buttons[n].focus();select(buttons[n]);};});
      select(buttons[0]);setInterval(()=>{if(!document.hidden)render();},2500);
    }
    const usd=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2});
    const model=document.getElementById('model-results');
    if(model){const update=()=>{let vol=Math.max(0,Number(document.getElementById('model-volume').value)||0),stake=Math.max(0,Number(document.getElementById('model-stake').value)||0),share=Math.min(100,Math.max(.01,Number(document.getElementById('model-staked').value)||.01));const daily=vol*.0006,yieldDaily=daily*.25*Math.min(1,stake/(1e9*share/100));model.innerHTML='<div><span>Protocol fees / day</span><strong>'+usd(daily)+'</strong></div><div><span>Protocol fees / year</span><strong>'+usd(daily*365)+'</strong></div><div><span>Modelled stake yield / day</span><strong>'+usd(yieldDaily)+'</strong></div><div><span>Modelled stake yield / year</span><strong>'+usd(yieldDaily*365)+'</strong></div>';};document.querySelectorAll('.pushin-calculator input').forEach(x=>x.addEventListener('input',update));update();}
    const lev=document.getElementById('pushin-example-leverage');
    if(lev){const update=()=>{document.getElementById('pushin-example-results').innerHTML=[['C-VIX 30D',10],['FR-BASIS BTC',20]].map(([name,max])=>{const l=lev.value==='max'?max:1;return '<article><h3>'+name+'</h3><dl><dt>Leverage</dt><dd>'+l+'×</dd><dt>Margin</dt><dd>1,000 virtual USDG</dd><dt>Notional</dt><dd>'+usd(1000*l)+'</dd><dt>Opening fee</dt><dd>'+usd(1000*l*.0006)+'</dd><dt>Maximum profit</dt><dd>$8,000</dd></dl></article>';}).join('');};lev.onchange=update;update();}
    document.querySelectorAll('a[href]').forEach(a=>{if(a.pathname===location.pathname&&!a.hash)a.setAttribute('aria-current','page');});
    document.querySelectorAll('button').forEach(b=>{if(b.textContent.trim()==='Copy'&&b.closest('pre')){b.onclick=()=>navigator.clipboard?.writeText(b.closest('pre').textContent.replace(/Copy$/,''));}});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
