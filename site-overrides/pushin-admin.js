(() => {
  const form = document.getElementById('contract-form'), input = document.getElementById('contract'), status = document.getElementById('status'), current = document.getElementById('current'), button = form.querySelector('button');
  async function request(options) {
    const r = await fetch('/api/contract', {cache:'no-store',signal:AbortSignal.timeout(10000),...options});
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Не удалось сохранить контракт.');
    return data;
  }
  request().then(data => {current.textContent = data.contract || 'Не задан'; if (!input.value) input.value = data.contract;}).catch(error => {current.textContent = 'Недоступно';status.textContent = error.message;});
  form.addEventListener('submit',async event => {
    event.preventDefault();button.disabled = true;status.textContent = 'Сохранение…';
    try {
      const data = await request({method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+document.getElementById('key').value},body:JSON.stringify({contract:input.value})});
      current.textContent = data.contract || 'Не задан';status.textContent = 'Сохранено. Значение обновится у посетителей автоматически.';
    } catch(error) {status.textContent = error.message;}
    finally {button.disabled = false;}
  });
})();
