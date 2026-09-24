(() => {
 function start(){
  document.querySelectorAll('header').forEach(header=>{
   const row=header.querySelector('.pushin-header-row');
   const menu=header.querySelector('.pushin-mobile-nav');
   if(row&&menu&&!row.contains(menu)) row.append(menu);
   if(menu){
    const trigger=menu.querySelector('summary');
    menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;trigger?.focus()}});
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{menu.open=false}));
    document.addEventListener('click',e=>{if(menu.open&&!menu.contains(e.target))menu.open=false});
   }
  });
  document.querySelectorAll('main table').forEach(table=>{
   if(table.closest('.pushin-table-scroll,.pa-table-wrap,.overflow-x-auto,.pushin-responsive-table'))return;
   const wrap=document.createElement('div');wrap.className='pushin-responsive-table';wrap.tabIndex=0;
   wrap.setAttribute('role','region');wrap.setAttribute('aria-label',table.caption?.textContent||'Scrollable data table');
   table.before(wrap);wrap.append(table);
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
