/** D3.13G2: after a REAL door-leaf escape, a stale disposable grid
 * prefix may steer the actor straight back into the open leaf.
 * Only shorten the existing route if its first leg is *physically blocked*
 * and a later node is directly reachable by the very same full-body sweep.
 * Preserve the original authored destination as the final node. No A*,
 * second motor, special geometry clearance or authored-order mutation.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
const gap=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
export function sweptRejoinExistingRoute(
 from:Pt,authoredGoal:Pt,nav:readonly Pt[],
 canSweep:(a:Pt,b:Pt)=>boolean
):Pt[]{
 if(nav.length<2||gap(nav[nav.length-1],authoredGoal)>3||
    canSweep(from,nav[0]))return [];
 // Bounded to nearby disposable legs. Never short-circuit a remote
 // door sequence, regardless of how many later intel nodes seem clear.
 for(let i=1;i<Math.min(nav.length,7);i++){
  if(gap(from,nav[i])>96||!canSweep(from,nav[i]))continue;
  return nav.slice(i).map(p=>({...p}));
 }
 return [];
}

/** G2B: retain only the existing disposable route after repeated true
 * physical overlap escapes at one unchanged doorway/GO. The stored route
 * has no execution authority; it is an input to a later cold world-truth
 * connector search when the body is wholly free of the leaf.
 *
 * Weak keys give one actor-bound transient episode; replacing a PlanNode,
 * door, goal or moving materially away retires the old evidence.
 */
type EscapeEpisode={
 orderId:number;doorId:string;goalX:number;goalY:number;
 anchor:Pt;lastAt:number;observations:number;nextProbeAt:number;
 priorRoute:Pt[];
};
const episodes=new WeakMap<TeamActor,EscapeEpisode>();
export function noteRepeatedDoorLeafEscape(
 actor:TeamActor,seconds:number,goal:Pt,doorId:string|null,
 nav:readonly Pt[]
):void{
 const order=actor.plan[0];
 if(!doorId||order?.kind!=='move'||nav.length<2||
    gap(nav[nav.length-1],goal)>3)return;
 const old=episodes.get(actor);
 const same=!!old&&old.orderId===order.id&&
   old.doorId===doorId&&old.goalX===goal.x&&old.goalY===goal.y&&
   seconds-old.lastAt<=2&&gap(actor.p,old.anchor)<24;
 if(!same){
  episodes.set(actor,{orderId:order.id,doorId,goalX:goal.x,goalY:goal.y,
    anchor:{...actor.p},lastAt:seconds,observations:1,
    nextProbeAt:seconds+.35,priorRoute:[]});
  return;
 }
 old!.lastAt=seconds;
 old!.observations=Math.min(4,old!.observations+1);
 // Make ONE copy on the third recurrence, not one per motor tick.
 if(old!.observations===3)
  old!.priorRoute=nav.map(p=>({...p}));
}
/** Consume one cold attempt. A failed path will not re-probe each frame.
 * Success or a materially changed door/GO starts a fresh episode.
 */
export function takeRepeatedDoorEscapeRoute(
 actor:TeamActor,seconds:number,goal:Pt
):Pt[]|null{
 const old=episodes.get(actor),order=actor.plan[0];
 if(!old||order?.kind!=='move'||order.id!==old.orderId||
    goal.x!==old.goalX||goal.y!==old.goalY){
  episodes.delete(actor);return null;
 }
 if(old.observations<3||!old.priorRoute.length||
    seconds-old.lastAt>2||seconds<old.nextProbeAt)return null;
 old.nextProbeAt=seconds+2;
 return old.priorRoute;
}
/** D3.31: read-only corroboration for high-partial generated ENTRY relief.
 * Repeatedly clearing the SAME real leaf with the SAME authored MOVE
 * is a stronger stuck-body witness than proximity or angle alone.
 * Never fabricate an escape, allocate an attempt or extend its lifetime.
 */
export function hasRepeatedPhysicalLeafEscapeEvidence(
 actor:TeamActor,seconds:number,goal:Pt,doorId:string
):boolean{
 const prior=episodes.get(actor),order=actor.plan[0];
 return !!prior&&order?.kind==='move'&&prior.orderId===order.id&&
   prior.doorId===doorId&&prior.goalX===goal.x&&
   prior.goalY===goal.y&&prior.observations>=3&&
   seconds-prior.lastAt<=2&&gap(actor.p,prior.anchor)<24;
}
export function finishDoorEscapeRejoin(actor:TeamActor):void{
 episodes.delete(actor);
}

/** H2C: per-authored-MOVE, per-physical-leaf cold A* allowance.
 * The H2B frame-approach fallback can spend two world searches every
 * repeated leaf escape even when the immovable jamb has no lawful path.
 * Cap only these OPTIONAL frame-approach searches; ordinary G2C direct
 * portal staging, physical release, and original order recovery remain
 * fully eligible. A changed real hinge, order or material body movement
 * resets the allowance. No global navigation or collision state.
 */
type FrameProbeBudget={
 orderId:number;doorId:string;goalX:number;goalY:number;
 leafFraction:number;position:Pt;probes:number;
};
const frameProbeBudgets=new WeakMap<TeamActor,FrameProbeBudget>();
export function claimColdFrameApproachProbe(
 actor:TeamActor,doorId:string,goal:Pt,leafFraction:number
):boolean{
 const order=actor.plan[0];
 if(order?.kind!=='move')return false;
 const old=frameProbeBudgets.get(actor);
 const same=!!old&&old.orderId===order.id&&old.doorId===doorId&&
  old.goalX===goal.x&&old.goalY===goal.y&&
  Math.abs(old.leafFraction-leafFraction)<.14&&
  gap(old.position,actor.p)<32;
 if(!same){
  frameProbeBudgets.set(actor,{orderId:order.id,doorId,
   goalX:goal.x,goalY:goal.y,leafFraction,
   position:{...actor.p},probes:1});
  return true;
 }
 if(old!.probes>=4)return false;
 old!.probes++;
 return true;
}

/** H4: one cold future-operable-door recovery per unchanged physical
 * episode. Unlike a local frame probe this may search for the NEXT
 * still-closed door, but its result is only temporary motor navigation.
 * No second motor, no false authored GO completion or remote open.
 * Author edits, a truly swung leaf or meaningful operator progress reset.
 */
type FuturePortalBudget={
 orderId:number;doorId:string;goalX:number;goalY:number;
 leafFraction:number;position:Pt;
};
const futurePortalBudgets=new WeakMap<TeamActor,FuturePortalBudget>();
export function claimColdFuturePortalProbe(
 actor:TeamActor,doorId:string,goal:Pt,leafFraction:number
):boolean{
 const order=actor.plan[0];
 if(order?.kind!=='move')return false;
 const old=futurePortalBudgets.get(actor);
 if(old&&old.orderId===order.id&&old.doorId===doorId&&
    old.goalX===goal.x&&old.goalY===goal.y&&
    Math.abs(old.leafFraction-leafFraction)<.14&&
    gap(old.position,actor.p)<32)return false;
 futurePortalBudgets.set(actor,{orderId:order.id,doorId,
  goalX:goal.x,goalY:goal.y,leafFraction,position:{...actor.p}});
 return true;
}
