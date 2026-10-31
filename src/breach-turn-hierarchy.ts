/** Shared anatomical turning request. The footstep scheduler remains sole
 * authority for physical corrective steps, while this module divides
 * incoming aim directions between head, shoulders and torso.
 */
export type TurnRequest={pelvisYaw:number;bodyHeading:number;
  targetHeading:number;speed:number;aiming:boolean};
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
export const turnDelta=(from:number,to:number)=>
  Math.atan2(Math.sin(to-from),Math.cos(to-from));
export function turnHierarchy(p:TurnRequest){
  // Three.js root Y is -world heading.
  const body=turnDelta(p.pelvisYaw,-p.bodyHeading);
  const target=turnDelta(p.pelvisYaw,-p.targetHeading);
  const targetWeight=p.aiming?.42:.18;
  const chest=clamp(body*(1-targetWeight)+target*targetWeight,
    -.70,.70);
  const head=clamp(target-chest,-.43,.43);
  const remaining=turnDelta(chest,target);
  return {chestYaw:chest,headYaw:head,
    needsFootTurn:Math.abs(body)>.52&&p.speed<12,
    extraWeaponYaw:remaining};
}
