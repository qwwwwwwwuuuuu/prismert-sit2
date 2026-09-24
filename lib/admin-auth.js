import {createHash,timingSafeEqual} from 'node:crypto';
export function isAdmin(req) {
  const secret=process.env.PUSHIN_ADMIN_SECRET;
  if (!secret || secret.length<24) return false;
  const header=String(req.headers.authorization||'');
  if (!header.startsWith('Basic ')) return false;
  const value=Buffer.from(header.slice(6),'base64').toString('utf8');
  const hash=value=>createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(value),hash(`admin:${secret}`));
}
export function challenge(res) {
  res.setHeader('WWW-Authenticate','Basic realm="Pushin admin", charset="UTF-8"');
  res.setHeader('Cache-Control','no-store');
  return res.status(401).send('Administrator sign-in required.');
}
