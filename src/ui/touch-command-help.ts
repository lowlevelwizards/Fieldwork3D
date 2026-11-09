/** Touch/pen long-press help never invokes an order. A consumed press also
 * suppresses the subsequent synthetic click; mouse keeps native tooltips. */
export function installTouchCommandHelp(
  button:HTMLButtonElement,showHelp:(text:string,duration:number)=>void,
  refresh:()=>void
){
  if(button.dataset.touchHelpInstalled==='true')return;
  button.dataset.touchHelpInstalled='true';
  let timer:ReturnType<typeof setTimeout>|null=null;
  let consumed=false,startX=0,startY=0;
  const clear=()=>{if(timer!==null){clearTimeout(timer);timer=null;}};
  const explain=()=>{
    const description=button.title||button.getAttribute('aria-label')||button.textContent;
    if(description){
      consumed=true;showHelp(description,5700);refresh();
    }
  };
  button.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'||button.disabled)return;
    clear();consumed=false;startX=event.clientX;startY=event.clientY;
    timer=setTimeout(()=>{timer=null;explain();},540);
  });
  button.addEventListener('pointermove',event=>{
    if(Math.hypot(event.clientX-startX,event.clientY-startY)>14)clear();
  });
  button.addEventListener('pointerup',clear);
  button.addEventListener('pointercancel',()=>{clear();consumed=false;});
  button.addEventListener('lostpointercapture',clear);
  button.addEventListener('pointerleave',clear);
  button.addEventListener('click',event=>{
    if(!consumed)return;
    consumed=false;event.preventDefault();event.stopImmediatePropagation();
  },true);
  button.addEventListener('contextmenu',event=>{
    if(event instanceof PointerEvent&&event.pointerType==='mouse')return;
    event.preventDefault();clear();explain();
  });
}
