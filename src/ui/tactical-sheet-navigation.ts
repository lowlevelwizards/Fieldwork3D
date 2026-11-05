/** Single visual/keyboard owner for large mission-side UI surfaces.
 * This never changes simulation phase or the player's orders.
 */
export type TacticalSheetName='settings'|'squad'|'briefing';
export function createTacticalSheetNavigation(
 surfaces:Record<TacticalSheetName,HTMLElement>,
 onDismiss:(name:TacticalSheetName)=>void
){
 const shield=document.createElement('div');
 shield.id='tacticalSheetShield';shield.hidden=true;
 shield.setAttribute('aria-hidden','true');
 document.body.append(shield);
 let active:TacticalSheetName|null=null;
 let priorFocus:HTMLElement|null=null;
 let restoreVersion=0;
 const order:readonly TacticalSheetName[]=['settings','squad','briefing'];
 const tabbable=(root:HTMLElement):HTMLElement[]=>Array.from(
  root.querySelectorAll<HTMLElement>(
   'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),'+
   'summary,[tabindex]:not([tabindex="-1"])'
  )).filter(node=>node.getClientRects().length>0&&
   !node.closest('[hidden]'));
 const sync=()=>{
  const now=order.find(name=>!surfaces[name].hidden)??null;
  if(now&&!active&&!priorFocus)
   priorFocus=document.activeElement instanceof HTMLElement?
    document.activeElement:null;
  active=now;shield.hidden=now===null;
  document.body.dataset.tacticalSheet=now??'';
  if(now){
   restoreVersion++;
   surfaces[now].setAttribute('aria-modal','true');
   surfaces[now].setAttribute('role','dialog');
  }else if(priorFocus){
   const focus=priorFocus,version=++restoreVersion;
   requestAnimationFrame(()=>{
    if(!active&&restoreVersion===version){
     priorFocus=null;
     if(focus.isConnected&&focus.getClientRects().length>0)
      focus.focus({preventScroll:true});
    }
   });
  }
 };
 const focusFirst=()=>{
  if(!active)return;
  const first=tabbable(surfaces[active])[0];
  first?.focus({preventScroll:true});
 };
 const dismiss=()=>{if(!active)return;onDismiss(active);sync();};
 shield.addEventListener('click',dismiss);
 // Existing gameplay code may dismiss a sheet during reset/phase changes.
 // Observe the actual DOM rather than allowing the backdrop to go stale.
 if(typeof MutationObserver!=='undefined'){
  const observer=new MutationObserver(()=>sync());
  for(const surface of Object.values(surfaces))
   observer.observe(surface,{attributes:true,attributeFilter:['hidden']});
 }
 document.addEventListener('keydown',event=>{
  if(!active||document.querySelector('.fw-confirm-backdrop'))return;
  if(event.key==='Escape'){
   event.preventDefault();event.stopPropagation();dismiss();
  }else if(event.key==='Tab'){
   const nodes=tabbable(surfaces[active]);
   if(!nodes.length){event.preventDefault();return;}
   const i=nodes.indexOf(document.activeElement as HTMLElement);
   if(event.shiftKey&&(i<=0)){
    event.preventDefault();nodes[nodes.length-1].focus();
   }else if(!event.shiftKey&&(i<0||i===nodes.length-1)){
    event.preventDefault();nodes[0].focus();
   }
  }
 },true);
 return {sync,focusFirst,dismiss,get active(){return active;}};
}
