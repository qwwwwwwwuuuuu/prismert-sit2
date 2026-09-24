import items from '../lib/meme-catalog.js';
export default async function handler(req,res){
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
 const id=String(req.query.id??'');
 if(!/^\d{1,2}$/.test(id)||!items[Number(id)])return res.status(404).send('GIF not found');
 const item=items[Number(id)];
 try{
  const r=await fetch(item.src,{signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error();
  const bytes=Buffer.from(await r.arrayBuffer());
  if(bytes.length>4*1024*1024||!bytes.subarray(0,6).toString().match(/^GIF8[79]a$/))throw Error();
  res.setHeader('Content-Type','image/gif');
  res.setHeader('Content-Disposition',`attachment; filename="pusheen-${item.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}.gif"`);
  res.setHeader('Cache-Control','public, max-age=86400');
  res.setHeader('X-Content-Type-Options','nosniff');
  return res.status(200).send(bytes);
 }catch{return res.status(502).send('GIF is temporarily unavailable. Please try again.');}
}
