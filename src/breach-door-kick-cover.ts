/** Physical kick-to-leaf impulse against incidental loose cover.
 * Uses the SAME bounded contact shove as the walking motor. No moving a
 * built-in wall, fixed cabinet, wedged door, or collision teleport.
 */
import {doorLeafSegment,type Door,type Pt} from './breach-core.ts';
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
