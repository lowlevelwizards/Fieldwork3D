/** R4.3: never promote shared squad floor knowledge to an individual
 * camera's discovered prop/cover set. Only authoritative fine/micro replay
 * samples are precise enough for this view. No historical LOS recomputation.
 */
import type {Pt} from './breach-core.ts';
export function personalGroundEvidenceAt(
  discovered:ReadonlySet<string>|null|undefined,
  p:Pt
):boolean{
  if(!discovered||!Number.isFinite(p.x)||!Number.isFinite(p.y))
    return false;
  const micro='micro:'+Math.floor(p.x/10)+','+Math.floor(p.y/10);
  const fine='fine:'+Math.floor(p.x/20)+','+Math.floor(p.y/20);
  return discovered.has(micro)||discovered.has(fine);
}
/** Structural walls/doors are separate physical occluders: disappearing
 * unknown walls would open an X-ray line to the next room. Never use this
 * helper to hide collision/LOS-blocking structural geometry.
 */
export function personalDecorVisible(
  squadKnown:boolean,
  bodycamActive:boolean,
  discovered:ReadonlySet<string>|null|undefined,
  p:Pt
):boolean{
  return bodycamActive?personalGroundEvidenceAt(discovered,p):squadKnown;
}
