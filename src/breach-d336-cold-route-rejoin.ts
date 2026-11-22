/** D3.36: cold, full-size MOTOR-EXACT rejoin of an already authored MOVE.
 * A genuinely stationary operator may retain an intel/grid NAV whose next
 * waypoint is inside a solid wall, despite a legal route to a LATER node
 * on the same transient path. No new global goal or doorway authority.
 *
 * This is a route PROPOSAL only. The existing fixed motor and actor/hinge
 * collision still execute all steps. Never edit the player's PlanNode.
 */
import type {Pt,Door} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment}
 from './breach-core.ts';
import {coldExactMotorGridRoute}
 from './breach-d327-exact-motor-grid.ts';
import {fullBodyMotorStrideClear}
 from './breach-stack-micro-corner.ts';
import {joinsExistingMotorRoute,fullBodyMotorRouteClear}
 from './breach-recovery-route-validation.ts';

const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type Claim={orderId:number;goal:Pt;anchor:Pt;revision:number;at:number};
const claimed=new WeakMap<TeamActor,Claim>();
/** Deliberately cold: actual >=3s wall obstruction, no ENTRY/STACK,
 * actual blocked first grid chord and no active hand/hinge crossing.
 * A remote stale door observation does not own the actor's future feet.
 * One attempt per unchanged physical location and world revision.
 */
export function claimColdExactExistingRouteRejoin(
 actor:TeamActor,goal:Pt,seconds:number,worldRevision:number,
 doors:readonly Door[],firstClear:boolean
):boolean{
 const order=actor.plan[0],nav=actor.nav;
 if(actor.side!=='blue'||order?.kind!=='move'||
    order.entryDoorId||order.stackDoorId||
    distance(order.p,goal)>.5||nav.length<3||
    distance(nav[nav.length-1],goal)>3||
    actor.lastBlocker!=='wall'||actor.blockedTime<3||
    actor.squeeze||actor.traversal||actor.traversalPending||
    actor.autoSidestep||actor.fireRetreatTarget||
    !Number.isFinite(seconds)||!Number.isFinite(worldRevision)||
    firstClear||distance(actor.p,nav[0])>28||
    distance(actor.p,goal)<30||
    seconds<actor.retryRouteAt)return false;
 if(actor.doorHandContact&&actor.doorHandContact.releasedAt===null)
  return false;
 if(actor.doorTraversal){
  const e=actor.doorTraversal;
  const leaf=doors.find(door=>door.id===e.doorId);
  if(!leaf||e.phase!=='blocked'||e.handContact||
     e.waypoints.length>0||
     pointToSegment(actor.p,doorLeafSegment(leaf))<
       OPERATOR_RADIUS+32)return false;
 }
 const previous=claimed.get(actor);
 if(previous&&previous.orderId===order.id&&
    distance(previous.goal,goal)<.5&&
    distance(previous.anchor,actor.p)<12&&
    previous.revision===worldRevision)return false;
 claimed.set(actor,{orderId:order.id,goal:{...goal},
  anchor:{...actor.p},revision:worldRevision,at:seconds});
 return true;
}
/** Probe at most THREE later existing waypoints (not an invented GO).
 * The exact A* is bounded and each 0.3-unit motor stride is full-body
 * swept. Preserve all original later nodes, including real closed doors.
 * If no legal connector exists, return [] with no actor mutation.
 */
export function selectColdExactExistingRouteRejoin(
 from:Pt,goal:Pt,old:readonly Pt[],
 stand:(at:Pt)=>boolean,
 sweep:(from:Pt,to:Pt)=>boolean
):Pt[]{
 if(old.length<3||distance(old[old.length-1],goal)>3||
    !stand(from)||sweep(from,old[0]))return [];
 let trials=0;
 for(let i=1;i<Math.min(5,old.length-1);i++){
  const target=old[i],span=distance(from,target);
  if(span<28||span>230||!stand(target))continue;
  trials++;
  const connector=coldExactMotorGridRoute(from,target,stand,
    (a,b)=>fullBodyMotorStrideClear(a,b,sweep),
    {step:4,maxExpansions:2200,padding:110,
     maxDistance:480,maxWaypoints:105});
  if(connector.length){
   const joined=joinsExistingMotorRoute(
     from,goal,old,i,connector,sweep,500);
   if(joined.length&&fullBodyMotorRouteClear(
      from,connector,sweep,500))return joined;
  }
  if(trials>=3)break;
 }
 return [];
}
