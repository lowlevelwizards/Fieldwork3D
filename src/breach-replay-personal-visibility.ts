/** R4.3: never promote shared squad floor knowledge to an individual
 * camera's discovered prop/cover set. Only authoritative fine/micro replay
 * samples are precise enough for this view. No historical LOS recomputation.
 */
import {preciseGroundEvidenceAt} from './breach-ground-knowledge.ts';
import type {Pt} from './breach-core.ts';
export function personalGroundEvidenceAt(
  discovered:ReadonlySet<string>|null|undefined,p:Pt
):boolean{
  return preciseGroundEvidenceAt(discovered,p);
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

/** A pushed fixture's CURRENT recorded coordinates are the evidence key.
 * Never reveal it from a cell occupied in a different moment, nor from
 * the authored layout or a remembered teammate discovery.
 */
export function personalCoverVisible(
  squadKnown:boolean,bodycamActive:boolean,
  discovered:ReadonlySet<string>|null|undefined,
  recordedPosition:Pt|null|undefined
):boolean{
  if(!bodycamActive)return squadKnown;
  return !!recordedPosition&&
    personalGroundEvidenceAt(discovered,recordedPosition);
}
