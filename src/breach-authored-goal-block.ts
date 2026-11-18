/** D3.10B — halt redundant route searches ONLY for a verified, known,
 * fixed authored MOVE landing. Never discover hidden cover through a HUD
 * status or silently move/cancel the player's chosen goal.
 * A changed destination or cover revision automatically releases the hold.
 */
import {OPERATOR_RADIUS,pointToSegment,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {isFootstepObstacle} from './breach-traversal-surfaces.ts';
import {canRelocateCover} from './breach-movable-cover.ts';

type HeldGoal={orderId:number;goalKey:string;revision:number;reason:string};
const held=new WeakMap<TeamActor,HeldGoal>();
/** Only describe a FIXED obstruction the actor has physically encountered
 * and which the squad's intel already knows. This is player guidance,
 * never a command to retarget or an assertion that some offset is safe.
 */
export function fixedGoalCorrectionText(blocker:'wall'|'furniture'):string{
 return blocker==='wall'?
  'MOVE BLOCKED · GO INSIDE WALL · DRAG WAYPOINT TO CLEAR FLOOR':
  'MOVE BLOCKED · GO INSIDE FURNITURE · DRAG WAYPOINT TO CLEAR FLOOR';
}

/** Use ONLY known and non-relocatable geometry. A closed/opening door,
 * an undiscovered prop, or a temporarily standing teammate is not a fixed
 * destination obstruction. Spatial indexes are already session-owned.
 */
export function knownFixedGoalBlock(s:Session,goal:Pt):'wall'|'furniture'|null{
 const world=sessionWorldGeometry(s);
 if(world.someWallNearPoint(goal,OPERATOR_RADIUS+1,(wall,i)=>
   s.intel.walls.has(i)&&
   pointToSegment(goal,wall)<OPERATOR_RADIUS+1))return 'wall';
 if(world.someCoverNearPoint(goal,OPERATOR_RADIUS,(cover,i)=>
   s.intel.cover.has(i)&&isFootstepObstacle(cover)&&
   !canRelocateCover(cover)&&
   Math.abs(goal.x-cover.x)<cover.w/2+OPERATOR_RADIUS&&
   Math.abs(goal.y-cover.y)<cover.h/2+OPERATOR_RADIUS))
  return 'furniture';
 return null;
}
/** Called only when the physical motor needs another route. Cold detection
 * starts after real obstruction time, not an arbitrary wait or an authored
 * SYNC. The cheap held-state check has no A* or world-geometry scan.
 */
export function holdKnownFixedAuthoredGoal(
 s:Session,a:TeamActor,goal:Pt,goalKey:string,dt:number,
 notify:(s:Session,text:string)=>void
):boolean{
 const node=a.plan[0];
 const active=!!node&&node.kind==='move'&&
   !node.entryDoorId&&!node.stackDoorId&&
   !a.doorTraversal&&!a.traversal&&!a.traversalPending;
 const previous=held.get(a);
 if(previous){
   if(!active||previous.orderId!==node!.id||
      previous.goalKey!==goalKey||
      previous.revision!==sessionWorldGeometry(s).revision){
     held.delete(a);
     if(a.orderIssue?.nodeId===previous.orderId&&
        a.orderIssue.reason===previous.reason)a.orderIssue=null;
     a.retryRouteAt=0;a.recoveryAttempts=0;
   }else{
     a.velocity=0;
     a.blockedTime+=dt;
     return true;
   }
 }
 // Never infer obstruction from distance alone. The operator must have
 // genuinely failed to move, close enough to have approached the landing.
 if(!active||a.blockedTime<3.5||
    Math.hypot(a.p.x-goal.x,a.p.y-goal.y)>64||
    (a.lastBlocker!=='route'&&a.lastBlocker!=='furniture'&&
     a.lastBlocker!=='wall'))return false;
 const obstruction=knownFixedGoalBlock(s,goal);
 if(!obstruction)return false;
 const reason=fixedGoalCorrectionText(obstruction);
 held.set(a,{orderId:node!.id,goalKey,
   revision:sessionWorldGeometry(s).revision,reason});
 a.orderIssue={nodeId:node!.id,reason,since:s.seconds};
 a.lastBlocker=obstruction;
 a.velocity=0;
 a.blockedTime+=dt;
 notify(s,a.name+' '+reason+' · ORDER RETAINED');
 return true;
}
