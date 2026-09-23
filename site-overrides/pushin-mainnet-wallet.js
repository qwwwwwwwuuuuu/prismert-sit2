/* PUSHIN: read-only wallet integration. No signing, approvals or transactions. */
(function (root) {
  'use strict';
  const network = Object.freeze({chainId:'0x1237',chainName:'Robinhood Chain',nativeCurrency:{name:'Ether',symbol:'ETH',decimals:18},rpcUrls:['https://rpc.mainnet.chain.robinhood.com'],blockExplorerUrls:['https://robinhoodchain.blockscout.com']});
  const validAddress = a => typeof a === 'string' && /^0x[0-9a-fA-F]{40}$/.test(a);
  function formatEther(hex) {
    const value = BigInt(hex);
    return `${value / 10n**18n}.${(value % 10n**18n).toString().padStart(18,'0').replace(/0+$/,'') || '0'}`;
  }
  function createWallet(changed = () => {}) {
    let provider, generation = 0, listeners = [], state = {address:null,chainId:null,balance:null,error:null,busy:false};
    const emit = patch => {state = {...state,...patch}; changed({...state});};
    function detach() { for (const [event,handler] of listeners) provider?.removeListener?.(event,handler); listeners=[]; }
    function disconnect() {generation++;detach();provider=null;emit({address:null,chainId:null,balance:null,error:null,busy:false});}
    async function refresh() {
      const p=provider, version=++generation;
      if (!p) return;
      emit({balance:null,error:null});
      try {
        const [accounts,chain] = await Promise.all([p.request({method:'eth_accounts'}),p.request({method:'eth_chainId'})]);
        if(version!==generation)return;
        const address=validAddress(accounts?.[0])?accounts[0]:null;
        const chainId='0x'+BigInt(chain).toString(16);
        emit({address,chainId});
        if(!address || chainId!==network.chainId)return;
        const raw=await p.request({method:'eth_getBalance',params:[address,'latest']});
        const finalChain=await p.request({method:'eth_chainId'});
        if(version===generation && BigInt(finalChain)===4663n)emit({balance:formatEther(raw)});
      } catch(e) {if(version===generation)emit({balance:null,error:'Unable to read wallet data. Retry in your wallet.'});}
    }
    async function connect(p) {
      disconnect(); provider=p; const version=generation; emit({busy:true});
      try {
        const accounts=await p.request({method:'eth_requestAccounts'});
        if(version!==generation)return;
        if(!validAddress(accounts?.[0]))throw new Error('No account provided');
        for(const event of ['accountsChanged','chainChanged']) {const handler=()=>{void refresh();};p.on?.(event,handler);listeners.push([event,handler]);}
        const handler=()=>disconnect();p.on?.('disconnect',handler);listeners.push(['disconnect',handler]);
        await refresh();
      } catch(e) {disconnect();emit({error:e.code===4001?'Connection declined. No demo account was created.':'Wallet connection failed. Please try again.'});}
      finally {emit({busy:false});}
    }
    async function switchNetwork() {
      if(!provider)return;
      const p=provider;emit({busy:true,error:null,balance:null});
      try {
        try {await p.request({method:'wallet_switchEthereumChain',params:[{chainId:network.chainId}]});}
        catch(e) {if(e.code!==4902)throw e;await p.request({method:'wallet_addEthereumChain',params:[network]});await p.request({method:'wallet_switchEthereumChain',params:[{chainId:network.chainId}]});}
        if(provider===p)await refresh();
      } catch(e) {emit({error:e.code===4001?'Network change declined.':'Network change failed. Check your wallet.'});}
      finally {emit({busy:false});}
    }
    return {connect,refresh,switchNetwork,disconnect,getState:()=>({...state})};
  }
  root.PushinWallet={network,createWallet,formatEther};
})(typeof window==='undefined'?globalThis:window);
