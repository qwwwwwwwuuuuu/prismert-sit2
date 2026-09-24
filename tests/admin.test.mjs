import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/admin.js';
test('admin HTML never served to an unauthenticated visitor',async()=>{
 process.env.PUSHIN_ADMIN_SECRET='test-secret-long-enough-for-admin';
 const call=async authorization=>{let code,body;const headers={};await handler({method:'GET',headers:{authorization}}, {setHeader(k,v){headers[k]=v;},status(v){code=v;return this;},send(v){body=v;return this;}});return {code,body,headers};};
 assert.equal((await call('')).code,401);
 assert.equal((await call('Basic '+Buffer.from('admin:wrong').toString('base64'))).code,401);
 const good=await call('Basic '+Buffer.from('admin:'+process.env.PUSHIN_ADMIN_SECRET).toString('base64'));
 assert.equal(good.code,200);assert.match(good.body,/contract-form/);
 delete process.env.PUSHIN_ADMIN_SECRET;
 assert.equal((await call('')).code,401);
});
