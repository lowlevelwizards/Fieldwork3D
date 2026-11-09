/** Keep a floating action palette pinned while a command finger is down.
 * Gesture ownership ends on the global pointer release, even off the palette.
 */
export function installPalettePointerGuard(palette:HTMLElement){
  const active=new Set<number>();
  const down=(event:PointerEvent)=>{
    if((event.target as HTMLElement).closest('button'))
      active.add(event.pointerId);
  };
  const up=(event:PointerEvent)=>{active.delete(event.pointerId);};
  const clear=()=>active.clear();
  palette.addEventListener('pointerdown',down);
  window.addEventListener('pointerup',up,{capture:true});
  window.addEventListener('pointercancel',up,{capture:true});
  window.addEventListener('blur',clear);
  const dispose=()=>{
    palette.removeEventListener('pointerdown',down);
    window.removeEventListener('pointerup',up,true);
    window.removeEventListener('pointercancel',up,true);
    window.removeEventListener('blur',clear);
    clear();
  };
  return {active,dispose};
}
