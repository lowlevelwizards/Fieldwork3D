/** WC5: aperture-owned physical state. Existing window sill remains the sole body collider. */
import type {WindowOpening} from './breach-site.ts';
import type {WindowCovering} from './breach-window-coverings.ts';
import {normalizeWindowCovering} from './breach-window-coverings.ts';
import type {Pt} from './breach-core.ts';
export const hardWindowCovering=(c:WindowCovering|undefined):boolean=>!!c&&(c.family==='hinged-shutter'||c.family==='rolling-shutter');
/** Conservative traversal clearance: no climbing through a partially deployed hard panel. */
export function hardCoveringBlocksTraversal(w:WindowOpening):boolean{
 const c=normalizeWindowCovering(w);return !!c&&hardWindowCovering(c)&&c.integrity!==0&&c.opening!==1;
}
export function coveringMountedSide(w:WindowOpening,c:WindowCovering,p:Pt):number{
 return w.vertical?(w.x-p.x)*c.side:(p.y-w.y)*c.side;
}
/** Rolling security shutters are operated from their protected interior side. */
export function coveringControlSide(c:WindowCovering): -1|1{
 return c.family==='rolling-shutter'?(c.side===1?-1:1):c.side;
}
export function hardCoveringBlocksPaneContact(w:WindowOpening,p:Pt):boolean{
 const c=normalizeWindowCovering(w);
 return !!c&&hardCoveringBlocksTraversal(w)&&coveringMountedSide(w,c,p)>0;
}

/** Stylized game material durability; not real-world protection ratings. */
export function coveringDamageAfterHit(c:WindowCovering,force:number):WindowCovering|null{
 if(c.integrity===0||!Number.isFinite(force)||force<=0)return null;
 const divisor=c.family==='rolling-shutter'?8:c.family==='hinged-shutter'?3:1;
 const integrity=Math.max(0,(c.integrity??1)-force/divisor);
 return normalizeWindowCovering({covering:{...c,integrity,...(integrity===0?{locked:false,opening:1 as const}:{})}})??null;
}
