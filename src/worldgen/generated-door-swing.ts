/** D3.13C — determine generated hinge orientation against the completed
 * building's OWN walls and furnished cover. A 32%-open viability probe can
 * select a leaf that permanently wedges before its 72% passage aperture.
 *
 * This runs ONCE during procedural generation, never in the motor. It does
 * not open, move, shorten, ghost, or weaken any physical door/wall/fixture.
 * Keep original historical swing when both directions are viable, and do
 * not rewrite deliberately paired double doors.
 */
import type {Site} from '../breach-site.ts';
import {OPERATOR_RADIUS} from '../breach-core.ts';
import {doorSwingBlocked} from '../breach-door.ts';
import type {SessionWorldGeometry} from '../breach-world-context.ts';

export const GENERATED_DOOR_PASSAGE_FRACTION=.72;

export function orientGeneratedDoorSwings(site:Site):Site{
 // The exact static fields read by doorSwingBlocked/cachedHingeSweepNeighborhood.
 // Its physical actor list is explicitly EMPTY; live contact remains the
 // authoritative runtime check once operators start moving.
 const world={
  site,walls:site.walls,cover:site.cover,revision:0
 } as unknown as SessionWorldGeometry;
 let changed=false;
 const doors=site.doors.map(door=>{
  if((door.kind&&door.kind!=='hinged')||door.pairedWith||
     (door.swing!==1&&door.swing!==-1))return door;
  const original={...door,open:false,openFraction:0};
  if(!doorSwingBlocked(original,GENERATED_DOOR_PASSAGE_FRACTION,
      [],OPERATOR_RADIUS,world))return door;
  const opposite:1|-1=door.swing===1?-1:1;
  const alternative={...original,swing:opposite};
  if(doorSwingBlocked(alternative,GENERATED_DOOR_PASSAGE_FRACTION,
      [],OPERATOR_RADIUS,world))return door;
  changed=true;
  return {...door,swing:alternative.swing};
 });
 return changed?{...site,doors}:site;
}
