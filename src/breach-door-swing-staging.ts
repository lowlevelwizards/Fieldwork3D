/** Q4: finite outward-hinge staging envelope. A cheap, GO-cached
 * annotation of the existing leaf: never an independent collision engine.
 */
import {doorCenter,OPERATOR_RADIUS,type Door,type Pt} from './breach-core.ts';
import {doorOpensTowardApproach} from './breach-entry-coordination.ts';
const size=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export const OUTWARD_QUEUE_LEAF_MARGIN=OPERATOR_RADIUS+6;
/** One precomputed minimum follower depth, never a forced retreat.
 * If the operator is already closer, they hold and the real hinge/physical
 * yield determines whether the door can finish opening.
 */
export function outwardSwingStagingDepth(door:Door,side:-1|1):number{
 if(door.kind==='sliding'||door.kind==='shutter'||door.wedged)return 0;
 const width=size(door.a,door.b);
 if(width<=OPERATOR_RADIUS*2)return 0;
 const mid=doorCenter(door);
 const n={x:-(door.b.y-door.a.y)/width,
  y:(door.b.x-door.a.x)/width};
 const approach={x:mid.x+n.x*side*24,y:mid.y+n.y*side*24};
 return doorOpensTowardApproach(door,approach)?
  width+OUTWARD_QUEUE_LEAF_MARGIN:0;
}
export function leafSweepNeedsStaging(door:Door):boolean{
 return door.open&&!door.wedged&&
  (door.openFraction??0)<.88&&
  (door.angularVelocity??0)>.12;
}
