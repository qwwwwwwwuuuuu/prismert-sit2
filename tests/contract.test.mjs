import {test} from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/contract.js';
test('shared contract storage, authorization, validation and failure handling',async () => {
  let stored=null;
  process.env.UPSTASH_REDIS_REST_URL='https://storage.example';
  process.env.UPSTASH_REDIS_REST_TOKEN='mock-token';
  process.env.PUSHIN_ADMIN_SECRET='test-only-admin-secret';
  const original=global.fetch;
  global.fetch=async (_,options) => {const cmd=JSON.parse(options.body);if(cmd[0]==='SET')stored=cmd[2];return {ok:true,json:async()=>({result:cmd[0]==='GET'?stored:'OK'})};};
  const call=async(method,body,authorized=true)=>{let code,payload;const res={setHeader(){},status(c){code=c;return this;},json(p){payload=p;return this;}};await handler({method,body,headers:{host:'site.example',origin:'https://site.example','content-type':'application/json',authorization:authorized?'Bearer test-only-admin-secret':'Bearer wrong'}},res);return {code,payload};};
  try {
    assert.equal((await call('GET')).payload.contract,'');
    assert.equal((await call('POST',{contract:'test'},false)).code,401);
    assert.equal(stored,null);
    assert.equal((await call('POST',{contract:'test'})).code,200);
    assert.equal((await call('GET')).payload.contract,'test');
    assert.equal((await call('POST',{contract:'next-contract'})).code,200);
    assert.equal((await call('GET')).payload.contract,'next-contract');
    assert.equal((await call('POST',{contract:'bad value'})).code,400);
    assert.equal((await call('POST',{contract:'x'.repeat(201)})).code,400);
    assert.equal((await call('GET')).payload.contract,'next-contract');
    assert.equal((await call('DELETE')).code,405);
    global.fetch=async()=>{throw Error('offline')};
    assert.equal((await call('POST',{contract:'test'})).code,502);
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    assert.equal((await call('GET')).code,503);
  } finally {global.fetch=original;}
});
