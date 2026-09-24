(function(){
'use strict';
const markets=[['CVIX30','C-VIX 30D','c-vix-30d',10],['FRBASIS-BTC','FR-BASIS BTC','fr-basis-btc',20],['FRBASIS-ETH','FR-BASIS ETH','fr-basis-eth',20]];
let selected='CVIX30',interval=60,snapshot=null,bars=[],requestId=0,failed=false;
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const n=(v,d=2)=>Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const signed=v=>(Number(v)>=0?'+':'')+n(v),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtMoney=v=>'$'+n(v);
function line(values,color='#ab6078'){
 const a=(values||[]).map(Number).filter(Number.isFinite);if(a.length<2)return '<span>No history available</span>';
 const low=Math.min(...a),range=Math.max(...a)-low||1;
 return '<svg viewBox="0 0 400 90" role="img" aria-label="Index history" preserveAspectRatio="none"><path d="'+a.map((v,i)=>(i?'L':'M')+(i/(a.length-1)*400).toFixed(1)+','+(80-(v-low)/range*70).toFixed(1)).join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>';
}
function chart(){
 const node=$('#pushin-live-chart');if(!node)return;
 const data=bars.map(x=>({t:x.t??x.time,o:Number(x.o??x.open),h:Number(x.h??x.high),l:Number(x.l??x.low),c:Number(x.c??x.close)})).filter(x=>[x.o,x.h,x.l,x.c].every(Number.isFinite));
 if(!data.length){node.innerHTML=line(selected==='CVIX30'?snapshot?.history:snapshot?.basis?.history);return;}
 const w=1000,h=320,left=12,right=70,top=15,bottom=30,pw=w-left-right,ph=h-top-bottom,min=Math.min(...data.map(x=>x.l)),max=Math.max(...data.map(x=>x.h)),pad=(max-min)*.08||.05,low=min-pad,range=max-min+2*pad,y=v=>top+(1-(v-low)/range)*ph,step=pw/data.length,cw=Math.max(1,step*.65);
 let svg='<svg viewBox="0 0 '+w+' '+h+'" role="img" aria-label="'+selected+' candlestick chart">';
 for(let i=0;i<5;i++){const yy=top+i*ph/4;svg+='<line x1="'+left+'" x2="'+(w-right)+'" y1="'+yy+'" y2="'+yy+'" stroke="#e9d7cb"/><text x="'+(w-right+10)+'" y="'+(yy+4)+'" fill="#866c5c" font-size="11">'+n(low+range*(1-i/4))+'</text>';}
 data.forEach((b,i)=>{const x=left+(i+.5)*step,color=b.c>=b.o?'#58a57d':'#c97792';svg+='<g><title>'+esc(String(b.t))+' · O '+n(b.o)+' H '+n(b.h)+' L '+n(b.l)+' C '+n(b.c)+'</title><line x1="'+x+'" x2="'+x+'" y1="'+y(b.h)+'" y2="'+y(b.l)+'" stroke="'+color+'"/><rect x="'+(x-cw/2)+'" y="'+Math.min(y(b.o),y(b.c))+'" width="'+cw+'" height="'+Math.max(1,Math.abs(y(b.o)-y(b.c)))+'" fill="'+color+'"/></g>';});
 [0,Math.floor(data.length/2),data.length-1].forEach(i=>{const date=new Date(typeof data[i].t==='number'&&data[i].t<1e12?data[i].t*1000:data[i].t);svg+='<text x="'+(left+(i+.5)*step)+'" y="'+(h-7)+'" text-anchor="'+(i===0?'start':i===data.length-1?'end':'middle')+'" fill="#866c5c" font-size="11">'+(isNaN(date)?'':date.toISOString().slice(11,16))+'</text>';});
 node.innerHTML=svg+'</svg>';
}
async function loadCandles(){const id=++requestId;try{const r=await fetch('/api/market-data?kind=candles&market='+selected+'&interval='+interval);if(!r.ok)throw Error();const d=await r.json();if(id!==requestId)return;bars=Array.isArray(d.candles)?d.candles:[];chart();}catch(_){if(id===requestId){bars=[];chart();}}}
function render(){
 if(!snapshot)return;
 const s=snapshot,m=s.markets.find(x=>x.market===selected),meta=markets.find(x=>x[0]===selected),age=Math.max(0,(Date.now()-s.at)/1000),fresh=!failed&&age<60&&s.feed?.fresh;
 $('#pushin-live-state').textContent=(fresh?'Live reference feed':'Snapshot · '+new Date(s.at).toLocaleString())+' · Trading on PUSHIN is simulated';
 $('#pushin-live-name').textContent=meta[1];$('#pushin-live-price').textContent=n(m?.last);$('#pushin-live-change').textContent=m?signed(m.last-m.open24h)+' / 24h':'—';$('#pushin-live-open').href='/trade.html?market='+meta[2];
 $('#pushin-live-stats').innerHTML=[['24h high',n(m?.high24h)],['24h low',n(m?.low24h)],['Open interest',fmtMoney((m?.oiLong||0)+(m?.oiShort||0))],['Leverage','up to '+meta[3]+'×']].map(([k,v])=>'<div><span>'+k+'</span><strong>'+v+'</strong></div>').join('');
 all('[data-live-tab]').forEach(b=>{const row=s.markets.find(m=>m.market===b.dataset.liveTab);b.querySelector('span').textContent=n(row?.last);b.setAttribute('aria-selected',String(b.dataset.liveTab===selected));});
 $('#pushin-live-tape').innerHTML=(s.fills||[]).slice(0,8).map(f=>'<tr><td>'+esc(markets.find(m=>m[0]===f.market)?.[1]||f.market)+'</td><td class="'+(f.side==='LONG'?'pushin-up':'pushin-down')+'">'+esc(f.side)+'</td><td>'+fmtMoney(f.size)+'</td><td>'+n(f.price)+'</td><td>'+Math.max(0,Math.round((s.at-new Date(f.at).getTime())/1000))+'s</td><td>'+esc(f.source)+'</td></tr>').join('')||'<tr><td colspan="6">No prints yet</td></tr>';
 all('[data-venue]').forEach(el=>{const rows=(s.oracles||[]).filter(o=>o.venue.startsWith(el.dataset.venue)),ok=rows.length&&rows.every(o=>o.ok),latency=rows.length?Math.max(...rows.map(o=>o.latencyMs)):null;el.textContent=(ok?(fresh?'Live':'Snapshot'):'Unavailable')+(latency!=null?' · '+latency+' ms':'');});
 const cv=s.markets.find(x=>x.market==='CVIX30'),btc=s.basis?.BTC,eth=s.basis?.ETH;
 const el=k=>$('[data-module-visual="'+k+'"]');
 el('cvix-index').innerHTML='<strong>'+n(s.index?.value)+'</strong><span>index points</span>'+line(s.history);
 el('basis-engine').innerHTML='<strong>BTC '+signed(btc?.spread)+' · ETH '+signed(eth?.spread)+'</strong><span>bps / 8h</span>'+line(s.basis?.history,'#b78c66');
 el('payout-cap').innerHTML='<div class="pushin-cap-line"><span>Margin posted</span><b>1×</b><i style="width:12.5%"></i></div><div class="pushin-cap-line"><span>Reserved from the pool</span><b>8×</b><i style="width:100%"></i></div><code>maxProfit = 8 × initialMargin</code>';
 el('oracle-dampener').innerHTML='<strong>+90% print → +4.5% settlement</strong>'+line([0,0,0,0,0,4.5,4.5,4.5,4.5],'#66a69a')+'<span>20% clamp · 5% step</span>';
 el('skew-engine').innerHTML='<strong>'+n((s.skew?.ratio||0)*100,1)+' / '+n((1-(s.skew?.ratio||0))*100,1)+'</strong><span>C-VIX book · simulated</span>'+line([1,1.5,2.25,4,9,16,36,81],'#bf9862')+'<span>50 / 50 · 1× &nbsp; 80 / 20 · 16× &nbsp; 90 / 10 · 81×</span>';
 all('[data-market-value]').forEach(e=>e.textContent=n(s.markets.find(m=>m.market===e.dataset.marketValue)?.last));
 all('[data-market-change]').forEach(e=>{const m=s.markets.find(m=>m.market===e.dataset.marketChange);e.textContent=m?signed(m.last-m.open24h)+' over the past 24h':'';});
 $('#pushin-surface-rows').innerHTML=(s.index?.contributors||[]).map(c=>{const o=s.oracles.find(o=>o.venue===c.venue);return '<tr><td>'+esc(c.venue.replace('-',' ').replace(/\b[a-z]/g,x=>x.toUpperCase()))+' options</td><td>'+n(c.weight*100,2)+'%</td><td>'+n(c.value)+'</td><td>'+n(o?.latencyMs,0)+' ms</td></tr>';}).join('')+'<tr><th>Blended, settled</th><td>100%</td><td>'+n(s.index?.value)+'</td><td>'+ (fresh?'Live':'Snapshot')+'</td></tr>';
 $('#pushin-funding-rows').innerHTML=[['binance','Binance'],['hyperliquid','Hyperliquid'],['robinhood','Lighter']].map(([key,name])=>'<tr><td>'+name+'</td><td>'+signed(btc?.[key])+'</td><td>'+signed(eth?.[key])+'</td><td>'+esc(s.sources?.funding?.[key]||'Unavailable')+'</td></tr>').join('')+'<tr><th>Spread, ΔFR</th><td>'+signed(btc?.spread)+'</td><td>'+signed(eth?.spread)+'</td><td>bps / 8h</td></tr>';
 if(!bars.length)chart();
}
async function refresh(){try{const r=await fetch('/api/market-data');if(!r.ok)throw Error();const s=await r.json();if(!Array.isArray(s.markets))throw Error();snapshot=s;failed=false;}catch(_){failed=true;if(!snapshot){try{const r=await fetch('/market-snapshot.json');snapshot=await r.json();}catch(_){$('#pushin-live-state').textContent='Market feed unavailable · retrying shortly';return;}}}render();}
function init(){const panel=$('[data-reference-market]');if(!panel)return;
 panel.innerHTML='<div class="pushin-preview-tabs" role="tablist" aria-label="Market">'+markets.map(([key,name])=>'<button role="tab" data-live-tab="'+key+'" aria-selected="'+(key===selected)+'">'+name+' <span>—</span></button>').join('')+'</div><div class="pushin-preview-heading"><div><h3 id="pushin-live-name">C-VIX 30D</h3><span id="pushin-live-state">Reading market feed…</span></div><strong id="pushin-live-price">—</strong><span id="pushin-live-change"></span><a id="pushin-live-open" href="/trade.html">Open terminal ↗</a></div><div id="pushin-live-stats" class="pushin-live-stats"></div><div class="pushin-timeframes">'+[[60,'1m'],[300,'5m'],[900,'15m'],[3600,'1h'],[14400,'4h'],[86400,'1D']].map(([v,n])=>'<button data-live-interval="'+v+'" aria-pressed="'+(v===interval)+'">'+n+'</button>').join('')+'</div><div id="pushin-live-chart"></div><div class="pushin-table-scroll"><table><thead><tr><th>Market</th><th>Side</th><th>Notional</th><th>Price</th><th>Age</th><th>Data</th></tr></thead><tbody id="pushin-live-tape"></tbody></table></div>';
 const tabs=all('[data-live-tab]');tabs.forEach((b,i)=>{b.onclick=()=>{selected=b.dataset.liveTab;bars=[];render();void loadCandles();};b.onkeydown=e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const j=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;tabs[j].focus();tabs[j].click();};});
 all('[data-live-interval]').forEach(b=>b.onclick=()=>{interval=Number(b.dataset.liveInterval);all('[data-live-interval]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));void loadCandles();});
 all('[data-term-lev]').forEach(b=>b.onclick=()=>{all('[data-term-lev]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));all('[data-term-market]').forEach(card=>{const lev=b.dataset.termLev==='max'?(card.dataset.termMarket==='cvix'?10:20):1;card.querySelector('[data-term-notional]').textContent=fmtMoney(1000*lev);card.querySelector('[data-term-leverage]').textContent=lev;card.querySelector('[data-term-fee]').textContent=fmtMoney(1000*lev*.0006);const liq=card.querySelector('[data-term-liquidation]');if(liq)liq.textContent='At '+lev+'×, a long is liquidated by a '+(90/lev).toFixed(1)+'% fall in the index';});});
 void refresh();void loadCandles();setInterval(()=>{if(!document.hidden){void refresh();void loadCandles();}},15000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
