(function(root){
  'use strict';
  const specs={'c-vix-30d':[45.42,.6,1],'fr-basis-btc':[.5,.09,10],'fr-basis-eth':[.23,.06,10]};
  function price(id,time=Date.now()){const [base,amp]=specs[id];return base+amp*(Math.sin(time/27000)+.3*Math.sin(time/6700));}
  function candles(id,interval=60000,now=Date.now(),count=60){
    const last=Math.floor(now/interval)*interval;
    return Array.from({length:count},(_,i)=>{
      const time=last-(count-1-i)*interval,end=Math.min(time+interval,now);
      const open=price(id,time),close=price(id,end);let high=Math.max(open,close),low=Math.min(open,close);
      for(let t=time;t<end;t+=1000){const p=price(id,t);high=Math.max(high,p);low=Math.min(low,p);}
      return {time,open,high,low,close};
    });
  }
  // Simplified educational score, not the reference protocol's settlement formula.
  function pnl(position,mark){return Math.max(-position.stake,Math.min(position.stake,(mark-position.entry)*position.direction*position.stake*specs[position.id][2]));}
  function create(){let cash=10000,positions=[],next=1;
    return {snapshot:()=>({cash,positions:positions.map(p=>({...p}))}),
      open(id,direction,stake,time=Date.now()){
        if(!specs[id]||![1,-1].includes(direction)||!Number.isFinite(stake)||stake<=0||stake>cash)throw Error('Enter a positive stake within your available balance.');
        const p={key:next++,id,direction,stake,entry:price(id,time)};cash-=stake;positions.push(p);return {...p};
      },close(key,time=Date.now()){const p=positions.find(p=>p.key===key);if(!p)return;cash+=p.stake+pnl(p,price(p.id,time));positions=positions.filter(p=>p.key!==key);},
      reset(){cash=10000;positions=[];}};
  }
  function mount(host,selected){
    const account=create();let interval=60000;
    const panel=document.createElement('div');panel.className='pm-simulator';
    panel.innerHTML=`<p class="pm-demo-warning"><strong>SIMULATION · VIRTUAL FUNDS</strong><br>Generated prices. No real trades or blockchain transactions. Balance resets on page reload.</p><div class="pm-candle-toolbar" role="group" aria-label="Chart timeframe"><button class="pa-button" data-interval="60000" aria-pressed="true">1m</button><button class="pa-button" data-interval="300000" aria-pressed="false">5m</button><button class="pa-button" data-interval="900000" aria-pressed="false">15m</button><span data-ohlc></span></div><svg viewBox="0 0 900 340" role="img" aria-label="Candlestick chart of simulated prices" class="pm-demo-chart"></svg><p data-demo-summary></p><label>Stake · credits <input data-demo-stake type="number" min="1" step="1" value="100"></label><div class="pm-actions"><button class="pa-button" data-demo-long>Long</button><button class="pa-button" data-demo-short>Short</button><button class="pa-button" data-demo-reset>Reset balance</button></div><p data-demo-error role="status"></p><details><summary>Calculation rules</summary><p>Educational score: price change × stake × direction × scale (C-VIX: 1; basis: 10), capped at ±stake. Not actual derivatives pricing; no fees, funding or liquidation model.</p></details><div data-demo-positions></div>`;
    host.append(panel);
    const money=n=>n.toFixed(2);
    function render(){
      const id=selected(),now=Date.now(),state=account.snapshot();
      host.querySelector('.pm-index-quote strong').textContent=money(price(id,now));
      host.querySelector('.pm-index-quote strong').setAttribute('aria-label','Simulated value');
      document.querySelectorAll('[data-market]').forEach(b=>{const n=b.querySelector('.pm-market-value');n.textContent=money(price(b.dataset.market,now));n.setAttribute('aria-label','Simulated value');});
      const bars=candles(id,interval,now),min=Math.min(...bars.map(c=>c.low)),max=Math.max(...bars.map(c=>c.high)),range=max-min||1;
      const y=v=>28+(max-v)/range*260;
      const svg=panel.querySelector('svg');
      const last=bars[bars.length-1];
      panel.querySelector('[data-ohlc]').textContent=`O ${money(last.open)}  H ${money(last.high)}  L ${money(last.low)}  C ${money(last.close)}`;
      let markup='';
      for(let i=0;i<=4;i++){const value=max-range*i/4,yy=y(value);markup+=`<line x1="12" x2="800" y1="${yy}" y2="${yy}" stroke="#ecd8cf"/><text x="810" y="${yy+4}" fill="#9a7768" font-size="12">${value.toFixed(3)}</text>`;}
      bars.forEach((c,i)=>{const x=18+i*13,color=c.close>=c.open?'#35ad82':'#df6680';markup+=`<g><title>${new Date(c.time).toISOString()} · O ${c.open.toFixed(3)} H ${c.high.toFixed(3)} L ${c.low.toFixed(3)} C ${c.close.toFixed(3)}</title><line x1="${x}" x2="${x}" y1="${y(c.high)}" y2="${y(c.low)}" stroke="${color}"/><rect x="${x-4}" y="${Math.min(y(c.open),y(c.close))}" width="8" height="${Math.max(1,Math.abs(y(c.open)-y(c.close)))}" fill="${color}"/></g>`;
        if(i%12===0)markup+=`<text x="${x}" y="320" fill="#9a7768" font-size="11">${new Date(c.time).toISOString().slice(11,16)}</text>`;
      });
      markup+=`<line x1="12" x2="800" y1="${y(last.close)}" y2="${y(last.close)}" stroke="#9a7768" stroke-dasharray="4 4"/><text x="850" y="335" fill="#9a7768" font-size="10">UTC</text>`;
      svg.innerHTML=markup;
      const unrealized=state.positions.reduce((sum,p)=>sum+pnl(p,price(p.id,now)),0);
      panel.querySelector('[data-demo-summary]').textContent=`Available: ${money(state.cash)} credits · Open score: ${money(unrealized)} · Positions: ${state.positions.length}`;
      const list=panel.querySelector('[data-demo-positions]');list.replaceChildren();
      if(!state.positions.length)list.textContent='No open positions. Wallet connection is not required.';
      state.positions.forEach(p=>{const row=document.createElement('div');row.className='pm-demo-position';const text=document.createElement('span');text.textContent=`${p.id.toUpperCase()} · ${p.direction===1?'Long':'Short'} · Stake ${money(p.stake)} · Entry ${money(p.entry)} · Score ${money(pnl(p,price(p.id,now)))}`;const close=document.createElement('button');close.className='pa-button';close.textContent='Close position';close.onclick=()=>{account.close(p.key);render();};row.append(text,close);list.append(row);});
    }
    function open(direction){try{account.open(selected(),direction,Number(panel.querySelector('[data-demo-stake]').value));panel.querySelector('[data-demo-error]').textContent='Position opened.';}catch(e){panel.querySelector('[data-demo-error]').textContent=e.message;}render();}
    panel.querySelector('[data-demo-long]').onclick=()=>open(1);
    panel.querySelector('[data-demo-short]').onclick=()=>open(-1);
    panel.querySelectorAll('[data-interval]').forEach(button=>{button.onclick=()=>{interval=Number(button.dataset.interval);panel.querySelectorAll('[data-interval]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();};});
    panel.querySelector('[data-demo-reset]').onclick=()=>{account.reset();render();panel.querySelector('[data-demo-error]').textContent='Balance reset to 10,000 credits.';};
    render();const timer=setInterval(()=>{if(!host.isConnected)clearInterval(timer);else if(!document.hidden)render();},2000);
    return render;
  }
  root.PushinSimulator={price,candles,pnl,create,mount};
})(typeof window==='undefined'?globalThis:window);
