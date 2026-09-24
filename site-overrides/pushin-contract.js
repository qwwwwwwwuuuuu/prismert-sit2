(() => {
  const box = document.getElementById('pushin-ca');
  if (!box) return;
  const value = box.querySelector('[data-ca-value]');
  const copy = box.querySelector('button');
  let contract = '', busy = false, timer;
  async function refresh() {
    if (busy || document.hidden) return;
    busy = true;
    try {
      const r = await fetch('/api/contract', {cache:'no-store',signal:AbortSignal.timeout(8000)});
      if (!r.ok) throw new Error();
      const data = await r.json();
      if (typeof data.contract !== 'string') throw new Error();
      contract = data.contract;
      value.textContent = contract || 'Not set'; value.title = contract;
      copy.disabled = !contract;
      box.title = '';
    } catch { box.title = 'Contract updates temporarily unavailable'; }
    finally { busy = false; clearTimeout(timer); timer = setTimeout(refresh,3000); }
  }
  copy.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(contract); copy.textContent = 'Copied!'; }
    catch { copy.textContent = 'Select CA'; const selection = getSelection(); const range = document.createRange(); range.selectNodeContents(value); selection.removeAllRanges(); selection.addRange(range); }
    setTimeout(() => {copy.textContent = 'Copy';},1800);
  });
  document.addEventListener('visibilitychange', () => {if (!document.hidden) refresh();});
  window.addEventListener('focus',refresh);
  refresh();
})();
