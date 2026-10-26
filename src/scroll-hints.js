export function setupScrollHints(){
  const markers=new Map();let scheduled=false;
  function update(){
    scheduled=false;
    for(const target of document.querySelectorAll('dialog,.sidebar,#board-space,.recognition-gallery,#scoreboard-list'))if(!markers.has(target)){
      const button=document.createElement('button');button.className='scroll-more';button.type='button';button.hidden=true;
      const owner=target.closest('dialog');(owner||document.body).append(button);
      button.onclick=()=>{
        const vertical=target.scrollHeight-target.clientHeight-target.scrollTop>6;
        target.scrollBy({top:vertical?target.clientHeight*.7:0,left:vertical?0:target.clientWidth*.7,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
      };
      markers.set(target,button);
    }
    for(const [target,button] of markers){
      if(!target.isConnected){button.remove();markers.delete(target);continue;}
      const owner=target.closest('dialog'),rect=target.getBoundingClientRect(),style=getComputedStyle(target);
      const visible=rect.width>0&&rect.height>0&&style.visibility!=='hidden'&&(!owner||owner.open)&&!(target.matches('.sidebar,#board-space')&&document.querySelector('dialog[open]'));
      const vertical=/(auto|scroll)/.test(style.overflowY)&&target.scrollHeight-target.clientHeight-target.scrollTop>6;
      const horizontal=/(auto|scroll)/.test(style.overflowX)&&target.scrollWidth-target.clientWidth-target.scrollLeft>6;
      button.hidden=!visible||!vertical&&!horizontal;
      const text=vertical?'— More —':'More →';if(button.textContent!==text)button.textContent=text;
      button.setAttribute('aria-label',vertical?'Scroll down for more':'Scroll right for more');
      button.style.left=`${Math.round(rect.left+rect.width/2)}px`;
      button.style.top=`${Math.round(Math.max(rect.top+4,Math.min(rect.bottom,innerHeight)-42))}px`;
    }
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  for(const event of ['scroll','click','keydown','load','toggle'])document.addEventListener(event,schedule,true);
  window.addEventListener('resize',schedule);
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  setInterval(schedule,1000);schedule();
}
