const {test}=require('node:test');
const assert=require('node:assert/strict');
require('./dist/pushin-mainnet-wallet.js');
const {createWallet,formatEther}=global.PushinWallet;
const address='0x'+'a'.repeat(40);
function provider(chain='0x1237'){
 const calls=[],handlers={};
 return {calls,handlers,chain,on:(k,h)=>handlers[k]=h,removeListener:(k)=>delete handlers[k],async request(x){calls.push(x);switch(x.method){case 'eth_requestAccounts':case 'eth_accounts':return [address];case 'eth_chainId':return this.chain;case 'eth_getBalance':return '0xde0b6b3a7640000';case 'wallet_switchEthereumChain':this.chain=x.params[0].chainId;return null;default:throw Error('Unexpected '+x.method);}}};
}
test('reads actual provider balance on mainnet without signing',async()=>{const p=provider(),w=createWallet();await w.connect(p);assert.equal(w.getState().balance,'1.0');assert.equal(w.getState().address,address);assert(!p.calls.some(c=>/sign|send|approve/i.test(c.method)));w.disconnect();assert.equal(w.getState().address,null);assert.equal(Object.keys(p.handlers).length,0);});
test('wrong chain never reads or displays its balance',async()=>{const p=provider('0x1'),w=createWallet();await w.connect(p);assert.equal(w.getState().balance,null);assert(!p.calls.some(c=>c.method==='eth_getBalance'));await w.switchNetwork();assert.equal(w.getState().chainId,'0x1237');assert.equal(w.getState().balance,'1.0');});
test('rejecting connection never creates a fake account',async()=>{const w=createWallet();await w.connect({request:async()=>{throw {code:4001};}});assert.equal(w.getState().address,null);assert.match(w.getState().error,/declined/);});
test('disconnect invalidates pending balance reads',async()=>{const p=provider(),w=createWallet();await w.connect(p);let finish;const old=p.request.bind(p);p.request=x=>x.method==='eth_getBalance'?new Promise(r=>finish=r):old(x);const job=w.refresh();await new Promise(r=>setImmediate(r));w.disconnect();finish('0xde0b6b3a7640000');await job;assert.equal(w.getState().balance,null);});
test('formats tiny balances without floating point loss',()=>{assert.equal(formatEther('0x1'),'0.000000000000000001');});
test('unknown chain is added only after switch error 4902',async()=>{const p=provider('0x1'),old=p.request.bind(p);let added=false;p.request=async x=>{if(x.method==='wallet_switchEthereumChain'&&!added)throw {code:4902};if(x.method==='wallet_addEthereumChain'){added=true;assert.equal(x.params[0].chainId,'0x1237');return;}return old(x);};const w=createWallet();await w.connect(p);await w.switchNetwork();assert(added);assert.equal(w.getState().balance,'1.0');});
