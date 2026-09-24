import {isAdmin,challenge} from '../lib/admin-auth.js';
import page from '../lib/admin-page.js';
import contract from './contract.js';
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Vercel-CDN-Cache-Control','no-store');
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('X-Frame-Options','DENY');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!isAdmin(req)) return challenge(res);
  if(req.method==='POST') return contract(req,res);
  if(req.method!=='GET') {res.setHeader('Allow','GET, POST');return res.status(405).send('Method not allowed');}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.setHeader('Content-Security-Policy',"default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  return res.status(200).send(page);
}
