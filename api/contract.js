import { isAdmin, challenge } from '../lib/admin-auth.js';
const KEY = 'pushin:contract:v1';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('CDN-Cache-Control', 'no-store');
  res.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({error:'Method not allowed'}); }
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const secret = process.env.PUSHIN_ADMIN_SECRET;
  if (!url || !token || !secret) return res.status(503).json({error:'Админка ещё не подключена к серверному хранилищу.'});
  async function redis(command) {
    const response = await fetch(url, {method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}, body:JSON.stringify(command), signal:AbortSignal.timeout(7000)});
    if (!response.ok) throw new Error('Storage unavailable');
    const data = await response.json();
    if (data.error) throw new Error('Storage error');
    return data.result;
  }
  try {
    if (req.method === 'GET') {
      const value = await redis(['GET', KEY]);
      return res.status(200).json(value ? JSON.parse(value) : {contract:'',updatedAt:null});
    }
    const origin = req.headers.origin;
    if (origin && origin !== `https://${req.headers.host}`) return res.status(403).json({error:'Forbidden'});
    if (!isAdmin(req)) return challenge(res);
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({error:'Expected JSON'});
    let body;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { return res.status(400).json({error:'Invalid JSON'}); }
    if (typeof body?.contract !== 'string' || body.contract.trim().length > 200 || /[\s\x00-\x1f\x7f]/.test(body.contract.trim())) return res.status(400).json({error:'Введите контракт без пробелов, до 200 символов.'});
    const value = {contract:body.contract.trim(),updatedAt:new Date().toISOString()};
    await redis(['SET',KEY,JSON.stringify(value)]);
    return res.status(200).json(value);
  } catch { return res.status(502).json({error:'Хранилище временно недоступно. Попробуйте ещё раз.'}); }
}
