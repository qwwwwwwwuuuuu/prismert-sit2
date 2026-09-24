(() => {
  const cards=[...document.querySelectorAll('.meme-card')];
  const filters=[...document.querySelectorAll('[data-filter]')];
  const dialog=document.getElementById('meme-dialog');
  const status=document.getElementById('meme-status');
  let items=[],selected=null,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,noticeTimer;
  const notify=text=>{status.textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{status.textContent='';},4500);};
  function freeze(card){
    const box=card.querySelector('.meme-art'),img=box.querySelector('img');
    if(!paused){box.classList.remove('is-paused');return;}
    if(!img.complete||!img.naturalWidth)return;
    let canvas=box.querySelector('canvas');
    if(!canvas){canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');box.append(canvas);}
    canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
    canvas.getContext('2d').drawImage(img,0,0);box.classList.add('is-paused');
  }
  function motion(){cards.forEach(freeze);const button=document.getElementById('meme-motion');button.textContent=paused?'Play GIFs':'Pause GIFs';button.setAttribute('aria-pressed',String(paused));}
  cards.forEach(card=>{const img=card.querySelector('img');img.addEventListener('load',()=>freeze(card));img.addEventListener('error',()=>{card.querySelector('.meme-view').textContent='Open preview';notify('A GIF could not load. You can open its Tenor source from the preview.');});});
  document.getElementById('meme-motion').onclick=()=>{paused=!paused;motion();};motion();
  filters.forEach(button=>button.onclick=()=>{
    filters.forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    let count=0;cards.forEach(card=>{card.hidden=button.dataset.filter!=='All'&&card.dataset.category!==button.dataset.filter;if(!card.hidden)count++;});
    document.getElementById('meme-count').textContent=`${count} GIF${count===1?'':'s'} to match your mood`;
  });
  async function download(index,button){
    const item=items[index];if(!item)return;
    button.disabled=true;notify('Preparing your GIF…');
    try{
      const response=await fetch(item.src,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error();
      const blob=await response.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='pusheen-'+item.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.gif';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('Your GIF is ready.');
    }catch{notify('Download unavailable. Open the GIF on Tenor from its preview.');openPreview(index);}
    finally{button.disabled=false;}
  }
  function openPreview(index){
    if(!items[index])return;selected=index;const item=items[index];document.getElementById('meme-large').src=item.src;document.getElementById('meme-large').alt=item.alt;document.getElementById('meme-title').textContent=item.title;document.getElementById('meme-source').href=item.source;
    if(!dialog.open)dialog.showModal();
  }
  document.querySelectorAll('[data-preview]').forEach(button=>button.onclick=()=>openPreview(Number(button.dataset.preview)));
  document.querySelectorAll('[data-download]').forEach(button=>button.onclick=()=>download(Number(button.dataset.download),button));
  document.querySelector('.meme-close').onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>{document.getElementById('meme-large').removeAttribute('src');});
  document.getElementById('meme-save').onclick=event=>download(selected,event.currentTarget);
  document.getElementById('meme-copy').onclick=async()=>{if(selected===null)return;try{await navigator.clipboard.writeText(items[selected].source);notify('Link copied!');}catch{notify('Open the Tenor source to copy its link.');}};
  fetch('/pushin-memes.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{items=data;}).catch(()=>notify('Gallery actions could not load. Please refresh.'));
})();
