(function(root){
  'use strict';
  const specs={'c-vix-30d':[45.42,.6,1],'fr-basis-btc':[.5,.09,10],'fr-basis-eth':[.23,.06,10]};
  function price(id,time=Date.now()){const [base,amp]=specs[id];return base+amp*(Math.sin(time/27000)+.3*Math.sin(time/6700));}
  // Simplified educational score, not the reference protocol's settlement formula.
  function pnl(position,mark){return Math.max(-position.stake,Math.min(position.stake,(mark-position.entry)*position.direction*position.stake*specs[position.id][2]));}
  function create(){let cash=10000,positions=[],next=1;
    return {snapshot:()=>({cash,positions:positions.map(p=>({...p}))}),
      open(id,direction,stake,time=Date.now()){
        if(!specs[id]||![1,-1].includes(direction)||!Number.isFinite(stake)||stake<=0||stake>cash)throw Error('Enter a positive stake within your demo balance.');
        const p={key:next++,id,direction,stake,entry:price(id,time)};cash-=stake;positions.push(p);return {...p};
      },close(key,time=Date.now()){const p=positions.find(p=>p.key===key);if(!p)return;cash+=p.stake+pnl(p,price(p.id,time));positions=positions.filter(p=>p.key!==key);},
      reset(){cash=10000;positions=[];}};
  }
  function mount(host,selected){
    const account=create();
    const panel=document.createElement('div');panel.className='pm-simulator';
    panel.innerHTML=`<p class="pm-demo-warning"><strong>SIMULATION · VIRTUAL CREDITS ONLY</strong><br>Generated prices, not a live market feed. No wallet, deposits or blockchain transactions. This session resets when the page is reloaded.</p><svg viewBox="0 0 800 180" role="img" aria-label="Generated demo price history" class="pm-demo-chart"><polyline fill="none" stroke="#df6f96" stroke-width="3"/><text x="16" y="25" fill="#9a7768" font-size="14">SIMULATED PRICE · NOT LIVE</text></svg><p data-demo-summary></p><label>Stake · virtual credits <input data-demo-stake type="number" min="1" step="1" value="100"></label><div class="pm-actions"><button class="pa-button" data-demo-long>Demo Long</button><button class="pa-button" data-demo-short>Demo Short</button><button class="pa-button" data-demo-reset>Reset demo</button></div><p data-demo-error role="status"></p><p>Educational score: price change × stake × direction × scale (C-VIX: 1; basis: 10), capped at ±stake. Not actual derivatives pricing; no fees, funding or liquidation model.</p><div data-demo-positions></div>`;
    host.append(panel);
    const money=n=>n.toFixed(2);
    function render(){
      const id=selected(),now=Date.now(),state=account.snapshot();
      host.querySelector('.pm-index-quote strong').textContent=money(price(id,now));
      host.querySelector('.pm-index-quote strong').setAttribute('aria-label','Simulated value');
      document.querySelectorAll('[data-market]').forEach(b=>{const n=b.querySelector('.pm-market-value');n.textContent=money(price(b.dataset.market,now));n.setAttribute('aria-label','Simulated value');});
      const values=Array.from({length:100},(_,i)=>price(id,now-(99-i)*2000));
      const min=Math.min(...values),range=Math.max(...values)-min||1;
      panel.querySelector('polyline').setAttribute('points',values.map((v,i)=>`${i*800/99},${165-(v-min)/range*115}`).join(' '));
      const unrealized=state.positions.reduce((sum,p)=>sum+pnl(p,price(p.id,now)),0);
      panel.querySelector('[data-demo-summary]').textContent=`Available: ${money(state.cash)} demo credits · Open score: ${money(unrealized)} · Positions: ${state.positions.length}`;
      const list=panel.querySelector('[data-demo-positions]');list.replaceChildren();
      if(!state.positions.length)list.textContent='No demo positions. Connect wallet is not required.';
      state.positions.forEach(p=>{const row=document.createElement('div');row.className='pm-demo-position';const text=document.createElement('span');text.textContent=`${p.id.toUpperCase()} · ${p.direction===1?'Long':'Short'} · Stake ${money(p.stake)} · Entry ${money(p.entry)} · Score ${money(pnl(p,price(p.id,now)))}`;const close=document.createElement('button');close.className='pa-button';close.textContent='Close demo position';close.onclick=()=>{account.close(p.key);render();};row.append(text,close);list.append(row);});
    }
    function open(direction){try{account.open(selected(),direction,Number(panel.querySelector('[data-demo-stake]').value));panel.querySelector('[data-demo-error]').textContent='Demo position opened. No real funds used.';}catch(e){panel.querySelector('[data-demo-error]').textContent=e.message;}render();}
    panel.querySelector('[data-demo-long]').onclick=()=>open(1);
    panel.querySelector('[data-demo-short]').onclick=()=>open(-1);
    panel.querySelector('[data-demo-reset]').onclick=()=>{account.reset();render();panel.querySelector('[data-demo-error]').textContent='Demo reset to 10,000 virtual credits.';};
    render();const timer=setInterval(()=>{if(!host.isConnected)clearInterval(timer);else if(!document.hidden)render();},2000);
    return render;
  }
  root.PushinSimulator={price,pnl,create,mount};
})(typeof window==='undefined'?globalThis:window);
