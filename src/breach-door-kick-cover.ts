/** Physical kick-to-leaf impulse against incidental loose cover.
 * Uses the SAME bounded contact shove as the walking motor. No moving a
 * built-in wall, fixed cabinet, wedged door, or collision teleport.
 */
import {doorLeafSegment,OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
import {doorSwingBlocked} from './breach-door.ts';
import type {Session} from './breach-game.ts';
import {autoShoveLightCover} from './breach-movable-cover.ts';
import {sessionWorldGeometry,publishSessionCoverToActiveSite}
 from './breach-world-context.ts';
const point=(leaf:ReturnType<typeof doorLeafSegment>,t:number):Pt=>({
 x:leaf.a.x+(leaf.b.x-leaf.a.x)*t,
 y:leaf.a.y+(leaf.b.y-leaf.a.y)*t
});
/** Try contact along the advancing panel rather than randomly shoving
 * every nearby prop. The existing relocateCover validates every 3-unit
 * step against furniture, walls, actors and the PRESENT solid leaf.
 * Returning null is a legitimate blocked hinge, never a permission to
 * phase the panel through heavy furniture. */
export function kickShoveLooseCover(s:Session,door:Door,
 fromFraction:number,toFraction:number):number|null{
 if(toFraction<=fromFraction+.01)return null;
 const from=doorLeafSegment({...door,openFraction:fromFraction});
 const to=doorLeafSegment({...door,openFraction:toFraction});
 const world=sessionWorldGeometry(s);
 const people=[
  ...s.operators.filter(o=>o.health>0).map(o=>o.p),
  ...s.civilians.filter(o=>o.health>0).map(o=>o.p)
 ];
 for(const t of [.94,.74,.54,.34]){
  const moved=autoShoveLightCover(s.coverState,point(from,t),point(to,t),
   world.walls,s.doors,people);
  if(moved===null)continue;
  s.objectRevision++;
  publishSessionCoverToActiveSite(s);
  return moved;
 }
 return null;
}

/** The visible impulse may stop on an immutable cabinet or wall before it
 * reaches the defender. Impact and stun cannot jump through the obstruction.
 * Static world tests only; dynamically struck actors are resolved with the
 * existing physically swept displacement in the door-order handler.
 * Bounded seven-probe bisection executes only for a deliberate kick. */
export function kickReachableImpactFraction(s:Session,door:Door,
 start:number,wanted:number):number{
 if(wanted<=start)return start;
 const world=sessionWorldGeometry(s);
 if(!doorSwingBlocked(door,wanted,[],OPERATOR_RADIUS,world))return wanted;
 let clear=start,blocked=wanted;
 for(let i=0;i<7;i++){
  const candidate=(clear+blocked)/2;
  if(doorSwingBlocked(door,candidate,[],OPERATOR_RADIUS,world))
   blocked=candidate;
  else clear=candidate;
 }
 return clear;
}
