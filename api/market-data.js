// Public market-data relay. It never forwards cookies, signatures or account requests.
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {res.setHeader('Allow','GET');return res.status(405).json({error:'method_not_allowed'});}
  const query = new URL(req.url, 'https://pushin.local').searchParams;
  const kind = query.get('kind') || 'snapshot';
  let target='https://prismperp.trade/api/snapshot';
  if(kind==='candles'){
    const market=query.get('market')||'CVIX30';
    const interval=Number(query.get('interval')||60);
    if(!['CVIX30','FRBASIS-BTC','FRBASIS-ETH'].includes(market)||![60,300,900,3600,14400,86400].includes(interval))return res.status(400).json({error:'invalid_market_or_interval'});
    target='https://prismperp.trade/api/candles?'+new URLSearchParams({market,interval:String(interval),limit:'120'});
  } else if(kind!=='snapshot')return res.status(400).json({error:'invalid_kind'});
  try{
    const response=await fetch(target,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw new Error('upstream_unavailable');
    const data=await response.json();
    res.setHeader('Cache-Control','public, s-maxage=10, stale-while-revalidate=20');
    if(kind==='candles')return res.status(200).json({market:data.market,interval:data.interval,candles:data.candles,coverage:data.coverage});
    if(!Array.isArray(data.markets)||!Number.isFinite(data.at))throw new Error('invalid_snapshot');
    const allowed=['at','live','feed','feeds','index','history','historyT','markets','basis','funding','oracles','skew','sources'];
    const result=Object.fromEntries(allowed.map(k=>[k,data[k]]));
    result.fills=Array.isArray(data.fills)?data.fills.slice(0,12).map(({market,side,size,price,source,at})=>({market,side,size,price,source,at})):[];
    return res.status(200).json(result);
  }catch(_){res.setHeader('Cache-Control','no-store');return res.status(503).json({error:'market_feed_unavailable'});}
};
