(function(){
  'use strict';
  const path=location.pathname;
  if(!/^\/(trade[^/]*|markets|basis|analytics|portfolio|connect)(\.html)?$/.test(path)){
    const notice=()=>{
      const banner=document.createElement('aside');
      banner.className='pm-launch-notice';
      banner.textContent='PUSHIN pre-launch: token and trading contracts are not deployed. Legacy derivatives documentation and contract references below are not active PUSHIN mainnet products. Do not send funds to those addresses.';
      document.body.prepend(banner);
    };
    if(document.readyState==='complete')notice();else window.addEventListener('load',notice,{once:true});
    return;
  }
  const providers=[];
  const markets=[
    {id:'c-vix-30d',label:'C-VIX 30D',name:'Crypto Volatility Index · 30 day',icon:'△',unit:'Index points'},
    {id:'fr-basis-btc',label:'FR-BASIS BTC',name:'Funding Rate Basis · BTC',icon:'₿',unit:'bps / 8h'},
    {id:'fr-basis-eth',label:'FR-BASIS ETH',name:'Funding Rate Basis · ETH',icon:'Ξ',unit:'bps / 8h'}
  ];
  let wallet,dialog,root,selectedMarket='c-vix-30d',refreshSimulation;
  function selectMarket(id,writeUrl=false){
    const market=markets.find(m=>m.id===id)||markets[0];
    selectedMarket=market.id;
    root.querySelectorAll('[data-market]').forEach(button=>{
      const active=button.dataset.market===market.id;
      button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;
    });
    root.querySelector('[data-market-title]').textContent=market.label;
    root.querySelector('[data-market-description]').textContent=market.name;
    root.querySelector('[data-market-icon]').textContent=market.icon;
    root.querySelector('[data-market-unit]').textContent=market.unit;
    root.querySelector('#pm-index-panel').setAttribute('aria-labelledby','tab-'+market.id);
    if(writeUrl){const url=new URL(location.href);url.searchParams.set('market',market.id);history.replaceState(null,'',url);}
    refreshSimulation?.();
  }
  function mountMarkets(){
    const section=document.createElement('section');section.className='pm-index-section';
    section.setAttribute('aria-label','Reference markets');
    section.innerHTML=`<div class="pm-market-tabs" role="tablist" aria-label="Select reference market">${markets.map(m=>`<button type="button" role="tab" id="tab-${m.id}" data-market="${m.id}" aria-controls="pm-index-panel" aria-selected="false" tabindex="-1"><span class="pm-market-icon" aria-hidden="true">${m.icon}</span><span>${m.label}</span><span class="pm-market-value" aria-label="No data">—</span></button>`).join('')}</div>
      <div id="pm-index-panel" class="pa-card pm-index-panel" role="tabpanel" tabindex="0"><div class="pm-index-heading"><span class="pm-market-icon" data-market-icon aria-hidden="true"></span><div><h2 data-market-title></h2><p data-market-description></p></div><div class="pm-index-quote"><strong aria-label="No data">—</strong><span data-market-unit></span></div><span class="pm-data-status">No data source connected</span></div><p>Reference market display only. Live index values and charts are not connected. These instruments cannot be traded on PUSHIN; connecting a mainnet wallet does not enable derivatives trading.</p></div>`;
    root.querySelector('.pm-grid').before(section);
    const tabs=Array.from(section.querySelectorAll('[data-market]'));
    tabs.forEach((button,i)=>{
      button.onclick=()=>selectMarket(button.dataset.market,true);
      button.onkeydown=e=>{let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;else if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(e.key==='Home')next=0;else if(e.key==='End')next=tabs.length-1;else return;e.preventDefault();tabs[next].focus();selectMarket(tabs[next].dataset.market,true);};
    });
    selectMarket(new URL(location.href).searchParams.get('market'));
    section.querySelector('.pm-data-status').remove();
    section.querySelector('#pm-index-panel > p').remove();
    refreshSimulation=window.PushinSimulator.mount(section.querySelector('#pm-index-panel'),()=>selectedMarket);
    window.addEventListener('popstate',()=>selectMarket(new URL(location.href).searchParams.get('market')));
  }
  function discover(detail){if(detail?.provider?.request&&!providers.some(p=>p.provider===detail.provider)){providers.push(detail);if(dialog?.open)renderWallets();}}
  window.addEventListener('eip6963:announceProvider',event=>discover(event.detail));
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  function renderWallets(){
    const list=dialog.querySelector('[data-wallets]');list.replaceChildren();
    for(const item of providers){const button=document.createElement('button');button.className='pa-button';button.textContent=item.info?.name||'Browser wallet';button.onclick=()=>{dialog.close();void wallet.connect(item.provider);};list.append(button);}
    if(!providers.length)list.textContent='No browser wallet detected. Open this site in an EVM wallet browser or install an EVM wallet extension, then refresh. Your seed phrase is never needed here.';
  }
  function choose(){
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    for(const p of window.ethereum?.providers||[window.ethereum])if(p)discover({provider:p,info:{name:'Browser wallet'}});
    renderWallets();dialog.showModal();
  }
  function update(s){
    if(!root)return;
    root.querySelector('[data-address]').textContent=s.address||'Not connected';
    root.querySelector('[data-balance]').textContent=s.balance===null?'—':s.balance+' ETH';
    root.querySelector('[data-error]').textContent=s.error||'';
    root.querySelector('[data-network]').textContent=!s.address?'Target: Robinhood Chain Mainnet · 4663':s.chainId==='0x1237'?'Connected to Robinhood Chain Mainnet · 4663':'Wrong network — switch to Robinhood Chain Mainnet';
    root.querySelector('[data-switch]').hidden=!s.address||s.chainId==='0x1237';
    root.querySelector('[data-disconnect]').hidden=!s.address;
    root.querySelector('[data-connect]').textContent=s.busy?'Waiting for wallet…':s.address?'Change wallet':'Connect wallet';
    root.querySelectorAll('[data-connect],[data-switch],[data-refresh]').forEach(b=>b.disabled=s.busy);
    const explorer=root.querySelector('[data-explorer]');explorer.hidden=!s.address;explorer.href=s.address?'https://robinhoodchain.blockscout.com/address/'+s.address:'#';
  }
  function mount(){
    document.body.className='pushin-paper-app';
    document.title='PUSHIN · Mainnet wallet';
    document.body.innerHTML=`<div class="pa-shell" id="pushin-mainnet"><header class="pa-header"><a class="pa-brand" href="/index.html">PUSHIN</a><nav class="pa-nav" aria-label="Main navigation">${[['Trade','trade'],['Markets','markets'],['Analytics','analytics'],['Portfolio','portfolio'],['Docs','docs']].map(([label,href])=>`<a href="/${href}.html" ${path.includes(href)?'aria-current="page"':''}>${label}</a>`).join('')}</nav><div class="pa-header-actions"><button class="pa-button" data-connect>Connect wallet</button></div></header>
    <main class="pm-main"><p class="pm-label">PUSHIN / MAINNET PRE-LAUNCH</p><h1>Your wallet. Your curious little corner of crypto.</h1><p>Real wallet reads on Robinhood Chain. PUSHIN token trading has not launched.</p><p data-network role="status"></p><p data-error role="alert"></p>
    <div class="pm-grid"><section class="pa-card"><h2>Market overview</h2><p>PUSHIN / ETH</p><div class="pm-empty"><span class="pm-paw" aria-hidden="true">🐾</span><h3>Waiting for the token launch</h3><p>No price chart, volume or order book is available yet. No simulated prices are shown for the PUSHIN token.</p></div><p>Price — &nbsp; Volume — &nbsp; Liquidity —</p></section>
    <section class="pa-card"><h2>Swap</h2><p>From · ETH</p><input aria-label="ETH amount" placeholder="0.00" disabled><p>To · PUSHIN</p><input aria-label="PUSHIN amount" placeholder="Unavailable" disabled><p>A verified PUSHIN contract, funded liquidity pool and supported swap integration are required.</p><button class="pa-button" disabled>Swap unavailable · token not launched</button><p>No funds are deposited or approved by connecting a wallet.</p></section></div>
    <section class="pa-card pm-account"><h2>Your mainnet wallet</h2><p data-address class="pm-address"></p><p>Native balance <strong data-balance>—</strong></p><p>Balances are read from your selected wallet provider, never from a simulated account.</p><div class="pm-actions"><button class="pa-button" data-switch hidden>Switch to Robinhood Mainnet</button><button class="pa-button" data-refresh>Refresh balance</button><button class="pa-button" data-disconnect hidden>Disconnect locally</button><a data-explorer hidden target="_blank" rel="noopener noreferrer">View address and history in explorer ↗</a></div></section>
    <section class="pa-card pm-account"><h2>Launch status</h2><p>Wallet connection: available · Token contract: not configured · Liquidity: not configured · Trading: unavailable</p><p>No derivatives, leverage, vault deposits or reward contracts are enabled. Connecting a mainnet wallet does not enable these services.</p></section></main></div><dialog class="pm-dialog"><h2>Connect a wallet</h2><p>Select a wallet detected in your browser. No signature or transaction is requested.</p><div data-wallets class="pm-wallets"></div><form method="dialog"><button class="pa-button">Close</button></form></dialog>`;
    root=document.getElementById('pushin-mainnet');dialog=document.querySelector('dialog');
    mountMarkets();
    wallet=window.PushinWallet.createWallet(update);update(wallet.getState());
    root.querySelector('[data-connect]').onclick=choose;
    root.querySelector('[data-switch]').onclick=()=>wallet.switchNetwork();
    root.querySelector('[data-refresh]').onclick=()=>wallet.getState().address?wallet.refresh():choose();
    root.querySelector('[data-disconnect]').onclick=()=>wallet.disconnect();
    document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a||a.target||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button)return;const url=new URL(a.href,location.href);if(url.origin===location.origin){e.preventDefault();e.stopImmediatePropagation();location.assign(url.href);}},true);
    setInterval(()=>{if(!document.hidden&&wallet.getState().address&&!wallet.getState().busy)void wallet.refresh();},30000);
  }
  if(document.readyState==='complete')setTimeout(mount,180);else window.addEventListener('load',()=>setTimeout(mount,180),{once:true});
})();
