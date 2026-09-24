(function () {
  "use strict";

  var STORE_KEY = "pushin-terminal-account-v2";
  var SESSION_KEY = "pushin-terminal-session-v2";
  var MARKET_LIST = [
    { key: "CVIX30", slug: "c-vix-30d", short: "C-VIX 30D", name: "Crypto Volatility Index · 30 day", base: 45.76, amp: 0.42, maxLev: 10, decimals: 2, unit: "" },
    { key: "FRBASIS-BTC", slug: "fr-basis-btc", short: "FR-BASIS BTC", name: "Funding Rate Basis · BTC", base: 0.46, amp: 0.075, maxLev: 20, decimals: 2, unit: " bps" },
    { key: "FRBASIS-ETH", slug: "fr-basis-eth", short: "FR-BASIS ETH", name: "Funding Rate Basis · ETH", base: 0.22, amp: 0.052, maxLev: 20, decimals: 2, unit: " bps" }
  ];
  var currentMarket = marketFromLocation();
  var currentSide = /side=short/i.test(location.href) ? "SHORT" : "LONG";
  var currentOrderType = "MARKET";
  var deskTab = "positions";
  var chartWindow = "1m";
  var chartMode='candles',bookMode='book';
  var timers = [];
  var lastPrices = {};
  var hardNavigationBound = false;

  function marketFromLocation() {
    var value = "";
    try { value = new URL(location.href).searchParams.get("market") || ""; } catch (_) {}
    if (!value) {
      var match = location.pathname.match(/market=([^&.]+)/i);
      value = match ? match[1] : "";
    }
    return MARKET_LIST.find(function (m) { return m.slug === value || m.key === value; }) || MARKET_LIST[0];
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  function seeded(seed) {
    var x = Math.sin(seed * 999.91) * 43758.5453;
    return x - Math.floor(x);
  }

  function priceOf(market, when) {
    var t = (when || Date.now()) / 1000;
    var phase = market.key === "CVIX30" ? 0.8 : market.key === "FRBASIS-BTC" ? 2.4 : 4.1;
    var slow = Math.sin(t / 43 + phase) * market.amp;
    var fast = Math.sin(t / 8.7 + phase * 1.9) * market.amp * 0.22;
    var drift = Math.sin(t / 173 + phase) * market.amp * 0.55;
    return Math.max(market.key === "CVIX30" ? 8 : -4, market.base + slow + fast + drift);
  }

  function fmt(value, decimals) {
    return Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: decimals == null ? 2 : decimals, maximumFractionDigits: decimals == null ? 2 : decimals });
  }
  function compact(value) {
    value = Number(value || 0);
    if (Math.abs(value) >= 1e9) return fmt(value / 1e9, 1) + "B";
    if (Math.abs(value) >= 1e6) return fmt(value / 1e6, 1) + "M";
    if (Math.abs(value) >= 1e3) return fmt(value / 1e3, 1) + "K";
    return fmt(value, 0);
  }
  function signed(value, decimals) {
    return (value >= 0 ? "+" : "−") + fmt(Math.abs(value), decimals == null ? 2 : decimals);
  }
  function id() { return Date.now() + Math.floor(Math.random() * 9999); }

  function defaultState() {
    return {
      balances: { USDG: 100000, ETH: 12.5 },
      positions: [],
      orders: [],
      history: [],
      realised: 0,
      fees: 0,
      createdAt: Date.now()
    };
  }
  function loadState() {
    try {
      var parsed = JSON.parse(localStorage.getItem(STORE_KEY));
      if (parsed && parsed.balances && Array.isArray(parsed.positions)) return parsed;
    } catch (_) {}
    var state = defaultState();
    saveState(state);
    return state;
  }
  function saveState(state) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (_) {}
  }
  function getSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (_) { return null; }
  }
  function setSession(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (_) {}
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }

  function marketByKey(key) { return MARKET_LIST.find(function (m) { return m.key === key; }) || MARKET_LIST[0]; }
  function marketMetrics(market) {
    var price = priceOf(market);
    var open = market.base + Math.sin((Date.now() - 86400000) / 43000) * market.amp;
    var bias = market.key === "CVIX30" ? 0.68 : market.key === "FRBASIS-BTC" ? 0.55 : 0.48;
    var total = market.key === "CVIX30" ? 33400000 : market.key === "FRBASIS-BTC" ? 18400000 : 13100000;
    return {
      price: price,
      open: open,
      high: Math.max(price, open) + market.amp * 1.8,
      low: Math.min(price, open) - market.amp * 1.5,
      longOi: total * bias,
      shortOi: total * (1 - bias),
      volume: total * 2.46,
      borrow: 0.0018 * Math.pow((Math.max(bias, 1 - bias) + .08) / (Math.min(bias, 1 - bias) + .08), 2)
    };
  }

  function header(active) {
    var session = getSession();
    var nav = [
      ["trade", "/trade.html", "Trade"], ["markets", "/markets.html", "Markets"], ["basis", "/basis.html", "Basis"],
      ["analytics", "/analytics.html", "Analytics"], ["portfolio", "/portfolio.html", "Portfolio"],
      ["overview", "/overview.html", "Overview"], ["protocol", "/protocol.html", "Protocol"], ["docs", "/docs.html", "Docs"], ["tokenomics", "/tokenomics.html", "Tokenomics"], ["roadmap", "/roadmap.html", "Roadmap"]
    ];
    return '<header class="pa-header">' +
      '<a class="pa-brand" href="/index.html"><img src="/brand/pusheen-mark.jpg" alt=""><span>Pushin</span></a>' +
      '<nav class="pa-nav">' + nav.map(function (n) { return '<a href="' + n[1] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + n[2] + '</a>'; }).join("") + '</nav>' +
      '<div class="pa-header-actions"><div class="pa-search"><input id="pa-search" type="search" placeholder="Search markets and docs" aria-label="Search"><div id="pa-search-results" class="pa-search-results"></div></div>' +
      '<button id="pa-session" class="pa-btn pa-btn-primary">' + (session ? shortAddress(session.address) : "Start trading") + '</button><a class="pa-btn pa-btn-small" href="/connect.html">Connect wallet</a></div></header>';
  }

  function ticker() {
    return '<div class="pa-ticker">' + MARKET_LIST.map(function (m) {
      return '<a class="pa-ticker-item" href="/trade.html?market=' + m.slug + '"><span class="pa-dot"></span><strong>' + m.short + '</strong><span class="pa-price" data-pa-price="' + m.key + '">—</span></a>';
    }).join("") + '<a class="pa-ticker-item" href="/markets.html">All markets</a></div>';
  }

  function statusbar() {
    return '<footer class="pa-statusbar"><strong>Simulation · generated data · virtual funds</strong><a href="/trade.html">Trade</a><a href="/markets.html">Markets</a><a href="/analytics.html">Risk</a><a href="/portfolio.html">PnL</a><div class="right"><a href="/connect.html">Mainnet wallet</a><span id="pa-clock"></span><a href="/docs.html">Docs</a></div></footer><div id="pa-toast" class="pa-toast" role="status"></div>';
  }

  function referenceSections(active) {
    function card(title,body){return '<section class="pa-section pa-card"><h2>'+title+'</h2>'+body+'</section>';}
    function table(head,rows){return '<div class="pa-table-wrap"><table class="pa-data-table"><thead><tr>'+head.map(function(h){return '<th>'+h+'</th>';}).join('')+'</tr></thead><tbody>'+rows.map(function(row){return '<tr>'+row.map(function(x){return '<td>'+x+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table></div>';}
    var funding=table(['Venue','Convention','Role','Connection'],[['Lighter','8h published rate','Native funding leg','Not connected'],['Binance','8h','Reference venue','Not connected'],['Hyperliquid','1h × 8','Reference venue','Not connected']]);
    if(active==='markets')return card('Funding legs',funding)+card('C-VIX composition',table(['Asset','Asset weight','Venue blend'],[['BTC','55%','75% Deribit / 25% Derive'],['ETH','45%','75% Deribit / 25% Derive']])+'<p>Reference construction. Displayed index values are generated for practice.</p>')+card('Latest prints',historyTable(loadState().history.slice(-10)))+card('Contract terms',MARKET_LIST.map(function(m){return '<p><a href="/markets/'+m.slug+'.html">'+m.short+' specification ↗</a> · Maximum '+m.maxLev+'× · 0.06% opening fee · 8× margin profit cap</p>';}).join(''));
    if(active==='basis')return card('Settlement','<p>Target specification: carry = notional × spread in basis points / 10,000 × elapsed seconds / 28,800. Long receives positive spread and pays negative spread; short takes the opposite side. The current practice terminal uses a simplified price-change PnL model.</p><a href="/protocol/basis-engine.html">FR-BASIS engine ↗</a>')+card('Using the spread','<p>Long expresses an expectation that native funding strengthens relative to the reference venues. Short expresses the reverse. A funding-basis position isolates a rate difference rather than spot-price direction.</p><a href="/docs/funding-basis.html">Funding calculation ↗</a>');
    if(active==='analytics')return card('Oracle events',table(['Time','Market','Raw push','Settled','State'],[['—','—','—','—','No connected oracle events']]))+card('Funding settlements',table(['Time','Market','Carry','State'],[['—','—','—','No on-chain settlements']]))+card('Data provenance',table(['Series','Current source','Persistence'],[['Index and candles','Generated practice values','Deterministic local model'],['Funding, open interest and book','Simulated','Local model'],['Positions and fills','Your practice account','This browser'],['Oracle and chain events','Not connected','None']]))+card('Open interest history','<p>No recorded open-interest history is available. The positioning table shows the current modelled snapshot.</p>')+card('Oracle circuit breaker','<p>The reference rule accepts an oracle move within a 20% band. Beyond the band, only 5% of the proposed move is applied, still bounded by the block limit. This is a protocol specification, not a connected PUSHIN oracle.</p><a href="/protocol/oracle-dampener.html">Oracle dampener ↗</a>')+card('Reserve and worst-case liability','<p>The maximum profit is eight times initial margin. The simulated reserve calculation above sums that cap across open positions. A future vault must reserve the liability before accepting each order and must keep withdrawable customer collateral separate.</p><a href="/protocol/payout-cap.html">Payout cap ↗</a>');
    return '';
  }

  function shell(active, content) {
    return '<div class="pa-shell">' + header(active) + ticker() + '<main class="pa-main">' + content + referenceSections(active) + '</main>' + statusbar() + '</div>';
  }

  function title(kickerText, titleText, body, action) {
    return '<div class="pa-title-row"><div><div class="pa-kicker">' + kickerText + '</div><h1>' + titleText + '</h1><p>' + body + '</p></div>' + (action || "") + '</div>';
  }

  function renderTrade() {
    var content = '<div class="pa-terminal" id="pa-terminal">' +
      '<section class="pa-market-head" id="pa-market-head"></section>' +
      '<section class="pa-chart-panel"><div class="pa-panel-head"><h3>Price</h3><div class="pa-chips">' + ["1m", "5m", "15m", "1h", "4h", "1D"].map(function (v) { return '<button class="pa-chip' + (v === chartWindow ? ' is-active' : '') + '" data-window="' + v + '">' + v + '</button>'; }).join("") + '</div></div><div class="pa-chart" id="pa-chart"></div></section>' +
      '<aside class="pa-book"><div class="pa-panel-head"><h3>Intent book</h3><span class="pa-source">● Simulated</span></div><div id="pa-orderbook"></div></aside>' +
      '<aside class="pa-ticket" id="pa-ticket"></aside>' +
      '<section class="pa-desk"><div class="pa-desk-tabs">' +
      [["positions", "Positions"], ["orders", "Open intents"], ["history", "Trade history"], ["market", "Market trades"], ["skew", "Skew pool"], ["vault", "Vault"]].map(function (t) { return '<button class="pa-desk-tab' + (t[0] === deskTab ? ' is-active' : '') + '" data-desk="' + t[0] + '">' + t[1] + '</button>'; }).join("") +
      '</div><div id="pa-desk-body" class="pa-table-wrap"></div></section></div>';
    document.body.innerHTML = shell("trade", content);
    bindGlobal();
    bindTrade();
    document.querySelector('.pa-chart-panel .pa-chips').insertAdjacentHTML('beforeend','<button class="pa-chip is-active" data-chart-mode="candles">Candles</button><button class="pa-chip" data-chart-mode="line">Line</button>');
    document.querySelector('.pa-book .pa-panel-head').innerHTML='<button class="pa-chip is-active" data-book-mode="book">Intent book</button><button class="pa-chip" data-book-mode="trades">Trades</button>';
    refreshTrade();
    timers.push(setInterval(function () { matchOrders(); refreshTrade(false); }, 1500));
  }

  function tradeHeadHtml() {
    var mm = marketMetrics(currentMarket);
    var change = mm.price - mm.open;
    var total = mm.longOi + mm.shortOi;
    return '<div class="pa-market-tabs">' + MARKET_LIST.map(function (m) {
      return '<button class="pa-market-tab' + (m.key === currentMarket.key ? ' is-active' : '') + '" data-market="' + m.key + '"><strong>' + m.short + '</strong> <span data-pa-inline-price="' + m.key + '">' + fmt(priceOf(m), m.decimals) + '</span></button>';
    }).join("") + '</div><div class="pa-market-summary"><div><h2>' + currentMarket.short + '</h2><small>' + currentMarket.name + ' · up to ' + currentMarket.maxLev + '×</small></div>' +
      '<div><span class="pa-live-price" id="pa-live-price">' + fmt(mm.price, currentMarket.decimals) + '</span> <span class="' + (change >= 0 ? 'pa-up' : 'pa-down') + '" id="pa-change">' + signed(change, currentMarket.decimals) + '</span></div>' +
      '<div class="pa-market-stats">' + stat("24h high", fmt(mm.high, currentMarket.decimals)) + stat("24h low", fmt(mm.low, currentMarket.decimals)) + stat("Open interest", "$" + compact(total)) + stat("Long / short", fmt(mm.longOi / total * 100, 1) + " / " + fmt(mm.shortOi / total * 100, 1)) + stat("Borrow / 8h", fmt(mm.borrow * 100, 4) + "%") + '</div></div>';
  }
  function stat(k, v) { return '<div class="pa-stat"><small>' + k + '</small><strong>' + v + '</strong></div>'; }

  function chartPoints(market, count) {
    var now = Date.now();
    var step = chartWindow === "1m" ? 60000 : chartWindow === "5m" ? 300000 : chartWindow === "15m" ? 900000 : chartWindow === "1h" ? 3600000 : chartWindow === "4h" ? 14400000 : 86400000;
    var points = [];
    for (var i = count - 1; i >= 0; i -= 1) {
      var time = now - i * step;
      var organic = priceOf(market, time) + (seeded(Math.floor(time / step) + market.key.length) - .5) * market.amp * .35;
      points.push({ t: time, v: organic });
    }
    return points;
  }
  function chartHtml(market) {
    var seconds={"1m":60,"5m":300,"15m":900,"1h":3600,"4h":14400,"1D":86400}[chartWindow];
    var now=Date.now(),step=seconds*1000,last=Math.floor(now/step)*step;
    var bars=Array.from({length:80},function(_,i){var t=last-(79-i)*step,end=Math.min(t+step,now),o=priceOf(market,t),c=priceOf(market,end),h=Math.max(o,c),l=Math.min(o,c);for(var j=1;j<50;j++){var v=priceOf(market,t+(end-t)*j/50);h=Math.max(h,v);l=Math.min(l,v);}return{t:t,o:o,c:c,h:h,l:l};});
    var lo=Math.min.apply(null,bars.map(function(b){return b.l;})),hi=Math.max.apply(null,bars.map(function(b){return b.h;})),range=hi-lo||1;
    var y=function(v){return 35+(hi-v)/range*270;},parts=[],lastBar=bars[79];
    for(var g=0;g<5;g++){var v=hi-range*g/4,yy=y(v);parts.push('<line x1="8" x2="910" y1="'+yy+'" y2="'+yy+'" stroke="#ecd8cf"/><text x="918" y="'+(yy+4)+'" fill="#9a7768" font-size="12">'+v.toFixed(3)+'</text>');}
    if(chartMode==='line')parts.push('<polyline fill="none" stroke="#df6f96" stroke-width="2" points="'+bars.map(function(b,i){return(14+i*11.2)+','+y(b.c);}).join(' ')+'"/>');
    else bars.forEach(function(b,i){var x=14+i*11.2,color=b.c>=b.o?'#35ad82':'#df6680';parts.push('<g><title>'+new Date(b.t).toISOString()+' O '+b.o.toFixed(3)+' H '+b.h.toFixed(3)+' L '+b.l.toFixed(3)+' C '+b.c.toFixed(3)+'</title><line x1="'+x+'" x2="'+x+'" y1="'+y(b.h)+'" y2="'+y(b.l)+'" stroke="'+color+'"/><rect x="'+(x-3)+'" y="'+Math.min(y(b.o),y(b.c))+'" width="6" height="'+Math.max(1,Math.abs(y(b.o)-y(b.c)))+'" fill="'+color+'"/></g>');});
    bars.forEach(function(b,i){if(i%16===0)parts.push('<text x="'+(14+i*11.2)+'" y="332" fill="#9a7768" font-size="12">'+new Date(b.t).toISOString().slice(step>=86400000?5:11,step>=86400000?10:16)+'</text>');});
    return '<svg viewBox="0 0 990 350" preserveAspectRatio="none" role="img" aria-label="'+market.short+' simulated '+chartMode+' chart"><text x="12" y="18" fill="#9a7768" font-size="12">O '+lastBar.o.toFixed(3)+' H '+lastBar.h.toFixed(3)+' L '+lastBar.l.toFixed(3)+' C '+lastBar.c.toFixed(3)+'</text>'+parts.join('')+'<line x1="8" x2="910" y1="'+y(lastBar.c)+'" y2="'+y(lastBar.c)+'" stroke="#9a7768" stroke-dasharray="3 4"/><text x="930" y="340" fill="#9a7768" font-size="10">UTC</text></svg>';
  }
  function bookHtml(market) {
    if(bookMode==='trades'){return '<table class="pa-book-table"><thead><tr><th>Price</th><th>Size</th><th>Time</th></tr></thead><tbody>'+Array.from({length:18},function(_,i){return '<tr><td class="'+(i%2?'pa-up':'pa-down')+'">'+fmt(priceOf(market,Date.now()-i*5000),2)+'</td><td>'+compact(1000+seeded(i)*40000)+'</td><td>'+new Date(Date.now()-i*5000).toISOString().slice(11,19)+'</td></tr>';}).join('')+'</tbody></table>';}
    var price = priceOf(market);
    var step = market.key === "CVIX30" ? .04 : .01;
    var asks = [], bids = [];
    for (var i = 7; i >= 1; i -= 1) asks.push({ p: price + step * i, s: 18000 + seeded(i + Math.floor(Date.now() / 8000)) * 90000 });
    for (var j = 1; j <= 7; j += 1) bids.push({ p: price - step * j, s: 21000 + seeded(j * 3 + Math.floor(Date.now() / 9000)) * 87000 });
    function rows(items, tone) { var sum=0; return items.map(function (x) { sum+=x.s; return '<tr><td class="' + tone + '">' + fmt(x.p, market.decimals) + '</td><td>$' + compact(x.s) + '</td><td>$' + compact(sum) + '</td></tr>'; }).join(""); }
    return '<table class="pa-book-table"><thead><tr><th>Price</th><th>Size</th><th>Total</th></tr></thead><tbody>' + rows(asks, "pa-down") + '</tbody></table><div class="pa-book-mid"><span>' + fmt(price, market.decimals) + '</span><small>Index · fills here</small></div><table class="pa-book-table"><tbody>' + rows(bids, "pa-up") + '</tbody></table>';
  }

  function ticketHtml() {
    var session = getSession();
    var margin = Number(document.getElementById("pa-margin") ? document.getElementById("pa-margin").value : 2500) || 2500;
    var leverage = Number(document.getElementById("pa-leverage") ? document.getElementById("pa-leverage").value : Math.min(5, currentMarket.maxLev));
    var price = priceOf(currentMarket);
    var notional = margin * leverage;
    var liquidation = currentSide === "LONG" ? price * (1 - .9 / leverage) : price * (1 + .9 / leverage);
    var fee = notional * .0006;
    var limitField = currentOrderType === "LIMIT" ? '<div class="pa-field"><label><span>Limit price</span><span>' + currentMarket.unit + '</span></label><div class="pa-input-wrap"><input id="pa-limit" type="number" step="0.01" value="' + fmt(price, currentMarket.decimals).replace(/,/g, "") + '"></div></div>' : "";
    return '<div class="pa-side-toggle"><button class="pa-toggle-btn long' + (currentSide === "LONG" ? ' is-active' : '') + '" data-side="LONG">Long</button><button class="pa-toggle-btn short' + (currentSide === "SHORT" ? ' is-active' : '') + '" data-side="SHORT">Short</button></div>' +
      '<div class="pa-order-toggle"><button class="pa-toggle-btn neutral' + (currentOrderType === "MARKET" ? ' is-active' : '') + '" data-order-type="MARKET">Market</button><button class="pa-toggle-btn neutral' + (currentOrderType === "LIMIT" ? ' is-active' : '') + '" data-order-type="LIMIT">Limit</button></div>' + limitField +
      '<div class="pa-field"><label><span>Margin · isolated</span><span>' + (session ? 'Balance $' + compact(loadState().balances.USDG) : 'No session') + '</span></label><div class="pa-input-wrap"><input id="pa-margin" type="number" min="10" step="10" value="' + margin + '"><span>USDG</span></div><div class="pa-quick">' + [500,2500,10000,50000].map(function (v) { return '<button data-margin="' + v + '">' + (v >= 1000 ? v/1000 + 'K' : v) + '</button>'; }).join("") + '</div></div>' +
      '<div class="pa-field"><label><span>Leverage</span><strong id="pa-lev-value">' + leverage + '×</strong></label><input id="pa-leverage" class="pa-range" type="range" min="1" max="' + currentMarket.maxLev + '" value="' + leverage + '"><div class="pa-range-labels"><span>1×</span><span>' + Math.ceil(currentMarket.maxLev / 2) + '×</span><span>' + currentMarket.maxLev + '×</span></div></div>' +
      '<div class="pa-ticket-summary">' + kv("Position size", fmt(notional, 2) + " USDG") + kv("Entry (est.)", fmt(price, currentMarket.decimals)) + kv("Liquidation", fmt(liquidation, currentMarket.decimals)) + kv("Max payout (8× margin)", fmt(margin * 8, 2) + " USDG") + kv("Opening fee (0.06%)", fmt(fee, 2) + " USDG") + '</div>' +
      '<button id="pa-submit" class="pa-btn pa-btn-primary pa-submit">' + (session ? (currentOrderType === "MARKET" ? "Place order" : "Place limit intent") : "Start trading") + '</button>' +
      '<section class="pa-market-info"><h3>Market info</h3>'+kv('Max leverage',currentMarket.maxLev+'×')+kv('Payout cap','8× margin')+kv('Settlement','Local paper ledger')+kv('Account balance',fmt(loadState().balances.USDG,2)+' virtual USDG')+'<a href="/markets/'+currentMarket.slug+'.html">Contract specification</a><details><summary>Calculation rules</summary><p>Simplified relative-price PnL, capped at −margin / +8× margin, with modelled borrowing. This local simulation does not reproduce the original protocol settlement engine.</p></details></section>';
  }
  function kv(k, v) { return '<div class="pa-kv"><span>' + k + '</span><strong>' + v + '</strong></div>'; }

  function bindTrade() {
    document.addEventListener("click", function (event) {
      var mode=event.target.closest('[data-chart-mode]');if(mode){chartMode=mode.dataset.chartMode;document.querySelectorAll('[data-chart-mode]').forEach(function(b){b.classList.toggle('is-active',b.dataset.chartMode===chartMode);});refreshChart();return;}
      var book=event.target.closest('[data-book-mode]');if(book){bookMode=book.dataset.bookMode;document.querySelectorAll('[data-book-mode]').forEach(function(b){b.classList.toggle('is-active',b.dataset.bookMode===bookMode);});refreshBook();return;}
      var marketButton = event.target.closest("[data-market]");
      if (marketButton) { currentMarket = marketByKey(marketButton.dataset.market); refreshTrade(); return; }
      var sideButton = event.target.closest("[data-side]");
      if (sideButton) { currentSide = sideButton.dataset.side; refreshTicket(); return; }
      var typeButton = event.target.closest("[data-order-type]");
      if (typeButton) { currentOrderType = typeButton.dataset.orderType; refreshTicket(); return; }
      var marginButton = event.target.closest("[data-margin]");
      if (marginButton) { var input = document.getElementById("pa-margin"); if (input) input.value = marginButton.dataset.margin; refreshTicket(true); return; }
      var windowButton = event.target.closest("[data-window]");
      if (windowButton) { chartWindow = windowButton.dataset.window; document.querySelectorAll("[data-window]").forEach(function (b) { b.classList.toggle("is-active", b.dataset.window === chartWindow); }); refreshChart(); return; }
      var deskButton = event.target.closest("[data-desk]");
      if (deskButton) { deskTab = deskButton.dataset.desk; document.querySelectorAll("[data-desk]").forEach(function (b) { b.classList.toggle("is-active", b.dataset.desk === deskTab); }); refreshDesk(); return; }
      var closeButton = event.target.closest("[data-close-position]");
      if (closeButton) { closePosition(Number(closeButton.dataset.closePosition)); return; }
      var cancelButton = event.target.closest("[data-cancel-order]");
      if (cancelButton) { cancelOrder(Number(cancelButton.dataset.cancelOrder)); return; }
      if (event.target.closest("#pa-submit")) { if (!getSession()) startSession(); else placeOrder(); }
    });
    document.addEventListener("input", function (event) {
      if (event.target.matches("#pa-margin,#pa-leverage")) refreshTicket(true);
    });
  }

  function refreshTrade(full) {
    if(!document.getElementById('pa-terminal'))return;
    document.getElementById("pa-market-head").innerHTML = tradeHeadHtml();
    refreshTicker(); refreshChart(); refreshBook(); refreshTicket(); refreshDesk(); updateClock();
  }
  function refreshChart() { var node = document.getElementById("pa-chart"); if (node) node.innerHTML = chartHtml(currentMarket); }
  function refreshBook() { var node = document.getElementById("pa-orderbook"); if (node) node.innerHTML = bookHtml(currentMarket); }
  function refreshTicket(preserve) {
    var node = document.getElementById("pa-ticket");
    if (!node) return;
    if(node.contains(document.activeElement)&&document.activeElement.matches('input')&&!preserve)return;
    var oldLimit=document.getElementById('pa-limit')?.value;
    var focusId=node.contains(document.activeElement)?document.activeElement.id:null;
    var margin = preserve && document.getElementById("pa-margin") ? document.getElementById("pa-margin").value : null;
    var leverage = preserve && document.getElementById("pa-leverage") ? document.getElementById("pa-leverage").value : null;
    node.innerHTML = ticketHtml();
    if(oldLimit!=null&&document.getElementById('pa-limit'))document.getElementById('pa-limit').value=oldLimit;
    if (margin != null) document.getElementById("pa-margin").value = margin;
    if (leverage != null) document.getElementById("pa-leverage").value = Math.min(Number(leverage), currentMarket.maxLev);
    if(focusId)document.getElementById(focusId)?.focus();
    var lev = document.getElementById("pa-leverage"); if (lev) document.getElementById("pa-lev-value").textContent = lev.value + "×";
  }

  function positionValue(position) {
    var market = marketByKey(position.market);
    var mark = priceOf(market);
    var direction = position.side === "LONG" ? 1 : -1;
    var gross = position.size * ((mark - position.entry) / Math.max(Math.abs(position.entry), .01)) * direction;
    var elapsed = Math.max(0, Date.now() - position.openedAt) / 28800000;
    var borrow = position.size * marketMetrics(market).borrow * elapsed;
    var net = Math.max(-position.margin, Math.min(position.margin * 8, gross - borrow));
    var liquidation = direction > 0 ? position.entry * (1 - .9 / position.leverage) : position.entry * (1 + .9 / position.leverage);
    return { mark: mark, gross: gross, borrow: borrow, net: net, liquidation: liquidation };
  }

  function refreshDesk() {
    var node = document.getElementById("pa-desk-body"); if (!node) return;
    var state = loadState();
    if (!getSession() && ["positions","orders","history"].indexOf(deskTab) >= 0) { node.innerHTML = '<div class="pa-empty">Start a paper session to view your positions, intents and history.</div>'; return; }
    if (deskTab === "positions") {
      node.innerHTML = '<table class="pa-data-table"><thead><tr><th>Market</th><th>Side</th><th>Size</th><th>Margin</th><th>Entry</th><th>Mark</th><th>Liq.</th><th>Open PnL</th><th></th></tr></thead><tbody>' + (state.positions.length ? state.positions.map(function (p) { var v=positionValue(p), m=marketByKey(p.market); return '<tr><td><strong>'+m.short+'</strong></td><td class="'+(p.side==='LONG'?'pa-up':'pa-down')+'">'+p.side+'</td><td>$'+fmt(p.size,2)+'</td><td>$'+fmt(p.margin,2)+'</td><td>'+fmt(p.entry,m.decimals)+'</td><td>'+fmt(v.mark,m.decimals)+'</td><td>'+fmt(v.liquidation,m.decimals)+'</td><td class="'+(v.net>=0?'pa-up':'pa-down')+'">'+signed(v.net,2)+'</td><td><button class="pa-btn pa-btn-small" data-close-position="'+p.id+'">Close</button></td></tr>'; }).join("") : '<tr><td class="pa-empty" colspan="9">No open positions yet</td></tr>') + '</tbody></table>';
    } else if (deskTab === "orders") {
      node.innerHTML = '<table class="pa-data-table"><thead><tr><th>Market</th><th>Side</th><th>Limit</th><th>Margin</th><th>Leverage</th><th>Age</th><th></th></tr></thead><tbody>' + (state.orders.length ? state.orders.map(function(o){var m=marketByKey(o.market);return '<tr><td>'+m.short+'</td><td class="'+(o.side==='LONG'?'pa-up':'pa-down')+'">'+o.side+'</td><td>'+fmt(o.limit,m.decimals)+'</td><td>$'+fmt(o.margin,2)+'</td><td>'+o.leverage+'×</td><td>'+age(o.createdAt)+'</td><td><button class="pa-btn pa-btn-small pa-btn-danger" data-cancel-order="'+o.id+'">Cancel</button></td></tr>';}).join(""):'<tr><td class="pa-empty" colspan="7">No resting intents</td></tr>') + '</tbody></table>';
    } else if (deskTab === "history") {
      node.innerHTML = historyTable(state.history);
    } else if (deskTab === "market") {
      var prints=[]; for(var i=0;i<12;i++){var m=MARKET_LIST[i%3],p=priceOf(m,Date.now()-i*41000);prints.push({market:m.key,side:i%2?'SHORT':'LONG',price:p,size:9000+seeded(i+7)*74000,at:Date.now()-i*41000,action:'Market fill'});} node.innerHTML=historyTable(prints);
    } else if (deskTab === "skew") {
      node.innerHTML='<table class="pa-data-table"><thead><tr><th>Market</th><th>Long OI</th><th>Short OI</th><th>Long share</th><th>Borrow / 8h</th><th>State</th></tr></thead><tbody>'+MARKET_LIST.map(function(m){var x=marketMetrics(m),r=x.longOi/(x.longOi+x.shortOi);return '<tr><td>'+m.short+'</td><td>$'+compact(x.longOi)+'</td><td>$'+compact(x.shortOi)+'</td><td>'+fmt(r*100,1)+'%</td><td>'+fmt(x.borrow*100,4)+'%</td><td>'+(r>.8||r<.2?'<span class="pa-warn">Skewed</span>':'Balanced')+'</td></tr>';}).join('')+'</tbody></table>';
    } else {
      var escrow = state.positions.reduce(function(sum,p){return sum+p.margin*8;},0), pool=20000000;
      node.innerHTML='<div style="padding:20px;max-width:760px">'+kv('Payout pool','$'+compact(pool))+kv('Worst-case liability','$'+compact(escrow))+kv('Headroom','$'+compact(pool-escrow))+kv('Coverage',fmt(pool/Math.max(escrow,1),2)+'×')+'<div class="pa-progress" style="margin-top:12px"><span style="width:'+Math.min(100,escrow/pool*100)+'%"></span></div></div>';
    }
  }
  function historyTable(items) {
    return '<table class="pa-data-table"><thead><tr><th>Time</th><th>Market</th><th>Action</th><th>Side</th><th>Price</th><th>Notional</th></tr></thead><tbody>' + (items.length ? items.slice().reverse().map(function(h){var m=marketByKey(h.market); return '<tr><td>'+new Date(h.at||h.closedAt||Date.now()).toLocaleTimeString()+'</td><td>'+m.short+'</td><td>'+(h.action||'Fill')+'</td><td class="'+(h.side==='LONG'?'pa-up':'pa-down')+'">'+h.side+'</td><td>'+fmt(h.price||h.entry,m.decimals)+'</td><td>$'+fmt(h.size||0,2)+'</td></tr>';}).join(''):'<tr><td class="pa-empty" colspan="6">No activity yet</td></tr>') + '</tbody></table>';
  }

  function startSession() {
    setSession({address:'Local account',kind:'simulation',createdAt:Date.now()});updateSessionButton();toast('Practice account ready. Virtual funds only.');if(document.getElementById('pa-ticket'))refreshTrade();else mount();
  }
  function updateSessionButton(){var b=document.getElementById('pa-session'),s=getSession();if(b)b.textContent=s?shortAddress(s.address):'Start trading';}
  function shortAddress(address){return address.length>14?address.slice(0,6)+'…'+address.slice(-4):address;}

  function placeOrder() {
    var state=loadState(), margin=Math.max(10,Number(document.getElementById('pa-margin').value)||0), lev=Number(document.getElementById('pa-leverage').value)||1, price=priceOf(currentMarket), fee=margin*lev*.0006;
    if(state.balances.USDG < margin+fee){toast('Not enough test USDG. Add collateral from Portfolio.');return;}
    if(currentOrderType==='LIMIT'){
      var limit=Number(document.getElementById('pa-limit').value); if(!Number.isFinite(limit)){toast('Enter a valid limit price.');return;}
      state.orders.push({id:id(),market:currentMarket.key,side:currentSide,margin:margin,leverage:lev,limit:limit,createdAt:Date.now()});
      saveState(state);toast('Limit intent is resting in the paper book.');deskTab='orders';refreshDesk();return;
    }
    executePosition(state,{market:currentMarket.key,side:currentSide,margin:margin,leverage:lev,price:price});
    saveState(state);toast('Paper order filled at '+fmt(price,currentMarket.decimals)+'.');deskTab='positions';refreshTrade();
  }
  function executePosition(state,order){var size=order.margin*order.leverage,fee=size*.0006;state.balances.USDG-=order.margin+fee;state.fees+=fee;var p={id:id(),market:order.market,side:order.side,margin:order.margin,size:size,leverage:order.leverage,entry:order.price,openedAt:Date.now()};state.positions.push(p);state.history.push({id:id(),market:p.market,side:p.side,price:p.entry,size:p.size,action:'Open',at:Date.now()});}
  function matchOrders(){var state=loadState(),changed=false,keep=[];state.orders.forEach(function(o){var price=priceOf(marketByKey(o.market)),hit=o.side==='LONG'?price<=o.limit:price>=o.limit,fee=o.margin*o.leverage*.0006;if(hit&&state.balances.USDG>=o.margin+fee){executePosition(state,{market:o.market,side:o.side,margin:o.margin,leverage:o.leverage,price:price});changed=true;toast('Limit intent filled: '+marketByKey(o.market).short);}else keep.push(o);});if(changed){state.orders=keep;saveState(state);refreshDesk();}}
  function closePosition(positionId){var state=loadState(),idx=state.positions.findIndex(function(p){return p.id===positionId;});if(idx<0)return;var p=state.positions[idx],v=positionValue(p),returned=Math.max(0,p.margin+v.net);state.balances.USDG+=returned;state.realised+=v.net;state.positions.splice(idx,1);state.history.push({id:id(),market:p.market,side:p.side,price:v.mark,size:p.size,action:'Close · PnL '+signed(v.net,2),at:Date.now()});saveState(state);toast('Position closed. Realised PnL '+signed(v.net,2)+' USDG.');refreshTrade();}
  function cancelOrder(orderId){var state=loadState();state.orders=state.orders.filter(function(o){return o.id!==orderId;});saveState(state);toast('Intent cancelled.');refreshDesk();}

  function renderMarkets() {
    var rows = MARKET_LIST.map(function(m){var x=marketMetrics(m),total=x.longOi+x.shortOi,chg=x.price-x.open;return '<tr><td><strong>'+m.short+'</strong><div class="pa-submetric">'+m.name+'</div></td><td><span class="pa-metric" style="font-size:21px">'+fmt(x.price,m.decimals)+'</span><div class="'+(chg>=0?'pa-up':'pa-down')+'">'+signed(chg,m.decimals)+'</div></td><td>'+fmt(x.low,m.decimals)+' — '+fmt(x.high,m.decimals)+'</td><td>$'+compact(total)+'</td><td>'+fmt(x.longOi/total*100,1)+' / '+fmt(x.shortOi/total*100,1)+'</td><td>'+fmt(x.borrow*100,4)+'%</td><td>$'+compact(x.volume)+'</td><td><span class="pa-source">● Modelled</span></td><td><a class="pa-btn pa-btn-small" href="/trade.html?market='+m.slug+'">Trade</a></td></tr>';}).join('');
    var content=title('Markets','Trade the risk beneath price','Three paper markets for volatility and cross-venue funding basis. Prices move continuously; liquidity, open interest and the order book are simulated.')+'<section class="pa-card"><div class="pa-table-wrap"><table class="pa-data-table"><thead><tr><th>Market</th><th>Last</th><th>24h range</th><th>Open interest</th><th>Long / short</th><th>Borrow / 8h</th><th>24h volume</th><th>Source</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div></section><section class="pa-section pa-grid pa-grid-3">'+MARKET_LIST.map(function(m){return '<article class="pa-card"><h3>'+m.short+'</h3><p>'+m.name+'</p><div class="pa-chart" style="height:180px;min-height:180px">'+chartHtml(m)+'</div></article>';}).join('')+'</section>';
    document.body.innerHTML=shell('markets',content);bindGlobal();timers.push(setInterval(renderSoftMarkets,2000));
    var marketTable=document.querySelector('.pa-main .pa-card');
    marketTable.insertAdjacentHTML('afterbegin','<div class="pa-chips" style="margin-bottom:16px"><button class="pa-chip is-active" data-category="all">All markets</button><button class="pa-chip" data-category="vol">Volatility</button><button class="pa-chip" data-category="basis">Funding basis</button></div>');
    marketTable.querySelectorAll('tbody tr').forEach(function(row,i){var m=MARKET_LIST[i];row.dataset.category=i===0?'vol':'basis';row.lastElementChild.innerHTML='<a class="pa-btn pa-btn-small" href="/trade.html?market='+m.slug+'&side=long">Long</a> <a class="pa-btn pa-btn-small" href="/trade.html?market='+m.slug+'&side=short">Short</a>';});
    marketTable.querySelectorAll('[data-category]').forEach(function(button){if(button.tagName!=='BUTTON')return;button.onclick=function(){marketTable.querySelectorAll('tbody tr').forEach(function(row){row.hidden=button.dataset.category!=='all'&&row.dataset.category!==button.dataset.category;});marketTable.querySelectorAll('button[data-category]').forEach(function(b){b.classList.toggle('is-active',b===button);});};});
  }
  function renderSoftMarkets(){refreshTicker();document.querySelectorAll('[data-pa-price]').forEach(function(n){var m=marketByKey(n.dataset.paPrice);n.textContent=fmt(priceOf(m),m.decimals);});updateClock();}

  function renderBasis() {
    var btc=marketMetrics(MARKET_LIST[1]),eth=marketMetrics(MARKET_LIST[2]);
    var content=title('Funding monitor','Cross-venue funding basis','Robinhood Chain funding minus the Binance and Hyperliquid reference average, normalised to an eight-hour basis.')+'<section class="pa-grid pa-grid-4">'+metricCard('FR-BASIS BTC',signed(btc.price,2)+' bps','Native funding rich to reference','up')+metricCard('FR-BASIS ETH',signed(eth.price,2)+' bps','Continuously accrued','up')+metricCard('Refresh cadence','15 seconds','Modelled inputs','')+metricCard('Settlement','Per second','Paper ledger','')+'</section><section class="pa-section pa-grid pa-grid-2"><article class="pa-card"><h2>BTC basis</h2><p>Robinhood Chain − mean(Binance, Hyperliquid)</p><div class="pa-chart" style="height:260px">'+chartHtml(MARKET_LIST[1])+'</div></article><article class="pa-card"><h2>ETH basis</h2><p>Normalised to an 8h interval</p><div class="pa-chart" style="height:260px">'+chartHtml(MARKET_LIST[2])+'</div></article></section><section class="pa-section pa-card"><h2>Funding by venue</h2><div class="pa-table-wrap"><table class="pa-data-table"><thead><tr><th>Venue</th><th>BTC / 8h</th><th>ETH / 8h</th><th>Latency</th><th>Status</th></tr></thead><tbody><tr><td>Lighter</td><td>+0.91%</td><td>+0.63%</td><td>18 ms</td><td class="pa-up">Modelled</td></tr><tr><td>Binance</td><td>+0.35%</td><td>+0.28%</td><td>82 ms</td><td class="pa-up">Modelled</td></tr><tr><td>Hyperliquid</td><td>+0.39%</td><td>+0.31%</td><td>54 ms</td><td class="pa-up">Modelled</td></tr></tbody></table></div></section>';
    document.body.innerHTML=shell('basis',content);bindGlobal();timers.push(setInterval(function(){refreshTicker();updateClock();},2000));
  }

  function renderAnalytics() {
    var state=loadState(),escrow=state.positions.reduce(function(s,p){return s+p.margin*8;},0),pool=20000000,unreal=state.positions.reduce(function(s,p){return s+positionValue(p).net;},0);
    var content=title('Risk monitor','Solvency, skew and oracle health','Every number below is computed from the same client-side paper ledger used by the terminal.')+'<section class="pa-grid pa-grid-4">'+metricCard('Payout pool','$'+compact(pool),'Simulated reserve','')+metricCard('Worst-case liability','$'+compact(escrow),'8× margin cap','warn')+metricCard('Reserve coverage',fmt(pool/Math.max(escrow,1),2)+'×','Fully covered','up')+metricCard('Open PnL',signed(unreal,2)+' USDG',state.positions.length+' open positions',unreal>=0?'up':'down')+'</section><section class="pa-section pa-grid pa-grid-2"><article class="pa-card"><h2>Positioning by market</h2><div class="pa-table-wrap"><table class="pa-data-table"><thead><tr><th>Market</th><th>Long OI</th><th>Short OI</th><th>Borrow / 8h</th><th>State</th></tr></thead><tbody>'+MARKET_LIST.map(function(m){var x=marketMetrics(m),r=x.longOi/(x.longOi+x.shortOi);return '<tr><td>'+m.short+'</td><td>$'+compact(x.longOi)+'</td><td>$'+compact(x.shortOi)+'</td><td>'+fmt(x.borrow*100,4)+'%</td><td>'+(r>.8?'<span class="pa-warn">Skewed</span>':'Balanced')+'</td></tr>';}).join('')+'</tbody></table></div></article><article class="pa-card"><h2>Oracle health</h2>'+['Deribit BTC surface','Deribit ETH surface','Derive BTC surface','Derive ETH surface','Binance BTC funding','Binance ETH funding','Hyperliquid funding','Lighter native funding leg','PUSHIN dampener'].map(function(n,i){return '<div class="pa-balance-row"><span>'+n+'</span><span class="pa-source">● '+(22+i*7)+' ms · Modelled</span></div>';}).join('')+'</article></section><section class="pa-section pa-card"><h2>Reserve utilisation</h2><p>Worst-case payout liability is reserved before an order opens.</p><div class="pa-progress"><span style="width:'+Math.min(100,escrow/pool*100)+'%"></span></div><div class="pa-kv"><span>Used</span><strong>'+fmt(escrow/pool*100,4)+'%</strong></div></section>';
    document.body.innerHTML=shell('analytics',content);bindGlobal();timers.push(setInterval(function(){refreshTicker();updateClock();},2000));
  }

  function renderPortfolio() {
    var state=loadState(),unreal=state.positions.reduce(function(s,p){return s+positionValue(p).net;},0),locked=state.positions.reduce(function(s,p){return s+p.margin;},0),session=getSession();
    var action=session?'<button id="pa-add-collateral" class="pa-btn pa-btn-primary">Add 10,000 test USDG</button>':'<button id="pa-start-portfolio" class="pa-btn pa-btn-primary">Start trading</button>';
    var content=title('Paper portfolio','Account and performance','Test collateral, open exposure and realised activity are stored only in this browser.',action)+'<section class="pa-grid pa-grid-4">'+metricCard('Free collateral','$'+fmt(state.balances.USDG,2),'USDG','')+metricCard('In use','$'+fmt(locked,2),'Isolated margin','')+metricCard('Open PnL',signed(unreal,2)+' USDG',state.positions.length+' positions',unreal>=0?'up':'down')+metricCard('Realised PnL',signed(state.realised,2)+' USDG','Fees $'+fmt(state.fees,2),state.realised>=0?'up':'down')+'</section><section class="pa-section pa-grid pa-grid-2"><article class="pa-card"><h2>Balances</h2><div class="pa-balance-row"><span>USDG</span><strong>'+fmt(state.balances.USDG,2)+'</strong></div><div class="pa-balance-row"><span>ETH test collateral</span><strong>'+fmt(state.balances.ETH,4)+'</strong></div><div class="pa-balance-row"><span>Session</span><strong>'+(session?shortAddress(session.address):'Not started')+'</strong></div></article><article class="pa-card"><h2>Exposure</h2>'+MARKET_LIST.map(function(m){var pos=state.positions.filter(function(p){return p.market===m.key;}),notional=pos.reduce(function(s,p){return s+p.size;},0);return '<div class="pa-balance-row"><span>'+m.short+'</span><strong>$'+fmt(notional,2)+'</strong></div>';}).join('')+'</article></section><section class="pa-section pa-card"><h2>Open positions</h2><div class="pa-table-wrap" id="pa-portfolio-positions"></div></section>';
    document.body.innerHTML=shell('portfolio',content);bindGlobal();
    var table=document.getElementById('pa-portfolio-positions');deskTab='positions';var temp=document.createElement('div');temp.id='pa-desk-body';table.appendChild(temp);refreshDesk();
    var add=document.getElementById('pa-add-collateral');if(add)add.addEventListener('click',function(){var s=loadState();s.balances.USDG+=10000;saveState(s);toast('10,000 test USDG added.');setTimeout(renderPortfolio,400);});
    var start=document.getElementById('pa-start-portfolio');if(start)start.addEventListener('click',startSession);
    document.addEventListener('click',function(e){var b=e.target.closest('[data-close-position]');if(b){closePosition(Number(b.dataset.closePosition));setTimeout(renderPortfolio,300);}});
    timers.push(setInterval(function(){refreshTicker();updateClock();},2000));
  }

  function renderConnect() {
    var session=getSession();
    var content=title('Paper access','Wallet and trading session','A wallet can identify the paper account. No funds move and no transaction is sent.')+'<section class="pa-grid pa-grid-2"><article class="pa-card"><h2>'+(session?'Session active':'Start a session')+'</h2><p>'+(session?'Connected as '+escapeHtml(shortAddress(session.address))+'. The session remains valid for 12 hours in this browser.':'Use an injected browser wallet when available, or continue with a local demo identity.')+'</p><button id="pa-connect-main" class="pa-btn pa-btn-primary">'+(session?'End paper session':'Start trading')+'</button></article><article class="pa-card"><h2>What the session may do</h2><div class="pa-balance-row"><span>Place and cancel paper intents</span><strong class="pa-up">Allowed</strong></div><div class="pa-balance-row"><span>Open and close simulated positions</span><strong class="pa-up">Allowed</strong></div><div class="pa-balance-row"><span>Move real assets</span><strong class="pa-down">Never</strong></div><div class="pa-balance-row"><span>Sign on-chain transactions</span><strong class="pa-down">Never</strong></div></article></section>';
    document.body.innerHTML=shell('connect',content);bindGlobal();document.getElementById('pa-connect-main').addEventListener('click',function(){if(getSession()){clearSession();toast('Paper session ended.');setTimeout(renderConnect,300);}else startSession();});
  }

  function metricCard(label,value,sub,tone){return '<article class="pa-card"><div class="pa-submetric">'+label+'</div><div class="pa-metric '+(tone==='up'?'pa-up':tone==='down'?'pa-down':tone==='warn'?'pa-warn':'')+'">'+value+'</div><div class="pa-submetric">'+sub+'</div></article>';}

  function bindGlobal() {
    refreshTicker(); updateClock();
    if (!hardNavigationBound) {
      document.addEventListener("click", function (event) {
        var link = event.target.closest && event.target.closest("a[href]");
        if (!link || link.target || link.hasAttribute("download") || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button) return;
        var destination;
        try { destination = new URL(link.href, location.href); } catch (_) { return; }
        if (destination.origin !== location.origin) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        location.href = destination.href;
      }, true);
      hardNavigationBound = true;
    }
    var sessionButton=document.getElementById('pa-session');if(sessionButton)sessionButton.addEventListener('click',function(){if(getSession()){location.href='/portfolio.html';}else startSession();});
    var input=document.getElementById('pa-search'),results=document.getElementById('pa-search-results');
    if(input&&results){input.addEventListener('input',function(){var q=input.value.trim().toLowerCase(),items=[['Trade terminal','/trade.html'],['Markets','/markets.html'],['Funding basis','/basis.html'],['Risk analytics','/analytics.html'],['Portfolio','/portfolio.html'],['Protocol','/protocol.html'],['Documentation','/docs.html']].concat(MARKET_LIST.map(function(m){return[m.short,'/trade.html?market='+m.slug];})).filter(function(x){return!q||x[0].toLowerCase().includes(q);}).slice(0,7);results.innerHTML=items.map(function(x){return '<a href="'+x[1]+'">'+x[0]+'</a>';}).join('');results.classList.toggle('is-open',!!q);});input.addEventListener('focus',function(){if(input.value)results.classList.add('is-open');});document.addEventListener('click',function(e){if(!e.target.closest('.pa-search'))results.classList.remove('is-open');});}
  }
  function refreshTicker(){document.querySelectorAll('[data-pa-price]').forEach(function(node){var m=marketByKey(node.dataset.paPrice),price=priceOf(m),prev=lastPrices[m.key];node.textContent=(m.key==='CVIX30'?'':price>=0?'+':'')+fmt(price,m.decimals);node.classList.toggle('pa-up',prev!=null&&price>prev);node.classList.toggle('pa-down',prev!=null&&price<prev);lastPrices[m.key]=price;});document.querySelectorAll('[data-pa-inline-price]').forEach(function(node){var m=marketByKey(node.dataset.paInlinePrice);node.textContent=fmt(priceOf(m),m.decimals);});}
  function updateClock(){var c=document.getElementById('pa-clock');if(c)c.textContent=new Date().toISOString().slice(11,19)+' UTC';}
  function toast(message){var node=document.getElementById('pa-toast');if(!node)return;node.textContent=message;node.classList.add('is-visible');setTimeout(function(){node.classList.remove('is-visible');},3300);}
  function age(at){var seconds=Math.max(0,Math.floor((Date.now()-at)/1000));return seconds<60?seconds+'s':Math.floor(seconds/60)+'m';}

  function mount() {
    timers.forEach(clearInterval); timers=[];
    var path=location.pathname.toLowerCase();
    if(path.indexOf('/trade')===0) renderTrade();
    else if(path.endsWith('/markets')||path.endsWith('/markets.html')) renderMarkets();
    else if(path.endsWith('/basis')||path.endsWith('/basis.html')) renderBasis();
    else if(path.endsWith('/analytics')||path.endsWith('/analytics.html')) renderAnalytics();
    else if(path.endsWith('/portfolio')||path.endsWith('/portfolio.html')) renderPortfolio();
    else if(path.endsWith('/connect')||path.endsWith('/connect.html')) renderConnect();
  }

  window.PushinMarketPreview = Object.freeze({
    markets: MARKET_LIST.map(function(m){return {slug:m.slug,short:m.short};}),
    snapshot: function(slug){var m=MARKET_LIST.find(function(x){return x.slug===slug;})||MARKET_LIST[0];return {slug:m.slug,short:m.short,price:priceOf(m),source:'generated',timestamp:Date.now()};},
    chart: function(slug){return chartHtml(MARKET_LIST.find(function(x){return x.slug===slug;})||MARKET_LIST[0]);}
  });
  var path=location.pathname.toLowerCase();
  var shouldMount=path.indexOf('/trade')===0||/^\/(markets|basis|analytics|portfolio)(\.html)?$/.test(path);
  if(shouldMount){
    var run=function(){setTimeout(function(){document.body.className='pushin-paper-app';mount();},180);};
    if(document.readyState==='complete')run();else window.addEventListener('load',run,{once:true});
  }
})();

