/** E1.E — display-only HUD height reconciliation.
 * Read layout once when the persistent HUD is attached, then only on size
 * changes. ResizeObserver is feature-tested; older embedded browsers retain
 * the original every-refresh measurement. No simulation or UI state ownership.
 */
export function createTacticalHudHeightSync(){
 let observed:HTMLElement|null=null;
 let observer:ResizeObserver|null=null;
 const measure=()=>{
  if(!observed)return;
  const value=Math.ceil(observed.getBoundingClientRect().height)+'px';
  const root=document.documentElement.style;
  if(root.getPropertyValue('--tactical-hud-height')!==value)
   root.setProperty('--tactical-hud-height',value);
 };
 return {
  sync(hud:HTMLElement){
   if(observed!==hud){
    observer?.disconnect();observer=null;
    observed=hud;
    // Paint the initial/changed mount before the asynchronous resize signal.
    measure();
    if(typeof ResizeObserver!=='undefined'){
     observer=new ResizeObserver(measure);
     observer.observe(hud);
    }
   }else if(!observer){
    // Fall back to exact pre-E1 synchronous measurement when unavailable.
    measure();
   }
  },
  dispose(){observer?.disconnect();observer=null;observed=null;}
 };
}
