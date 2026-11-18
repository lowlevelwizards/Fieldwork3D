/** D3.21B: a narrow, once-per-order PHYSICAL backward departure from a
 * partially open, stationary door leaf that has trapped the authoring motor
 * before it could acquire its first route (Garage FRONT 19285501).
 * Selector only: it cannot move anyone or advance a leaf, and uses the
 * same exact full-body 0.3-unit sweeps as the authoritative motor.
 */
import {OPERATOR_RADIUS,doorLeafSegment,pointToSegment,type Door,type Pt}
 from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import {fullBodyMotorStrideClear} from './breach-stack-micro-corner.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const claims=new WeakMap<TeamActor,{orderId:number;doorId:string}>();
export function claimBlockedHingeStepback(a:TeamActor,door:Door):boolean{
 const order=a.plan[0];
 if(a.side!=='blue'||order?.kind!=='move'||
    order.stackDoorId||order.entryDoorId||a.nav.length>0||
    a.squeeze||a.traversal||a.traversalPending||
    a.doorTraversal?.doorId!==door.id||
    a.doorTraversal.phase!=='blocked'||
    a.doorTraversal.maneuver!=='grab-and-hold'||
    a.blockedTime<1.2||
    !['route','door'].includes(a.lastBlocker??'')||
    !door.open||door.locked||door.jammed||door.wedged||
    door.kind==='sliding'||door.kind==='shutter'||
    (door.openFraction??0)<.65||(door.openFraction??0)>=.96||
    Math.abs(door.angularVelocity??0)>.18||
    pointToSegment(a.p,doorLeafSegment(door))>OPERATOR_RADIUS+5)
   return false;
 const prior=claims.get(a);
 if(prior?.orderId===order.id&&prior.doorId===door.id)return false;
 // One cold attempt per real authored order and physical leaf only.
 claims.set(a,{orderId:order.id,doorId:door.id});
 return true;
}
/** A short opposite-goal step is allowed ONLY if it increases real leaf
 * clearance enough to let the ordinary hinge attempt continue. Never edit
 * the original long-distance authored MOVE; this is a transient motor node.
 */
export function selectBlockedHingeStepback(
 from:Pt,goal:Pt,door:Door,
 canStand:(p:Pt)=>boolean,sweep:(a:Pt,b:Pt)=>boolean
):Pt|null{
 const leaf=doorLeafSegment(door);
 const before=pointToSegment(from,leaf);
 if(before<OPERATOR_RADIUS-.6||before>OPERATOR_RADIUS+5)return null;
 // A step that clears the leaf at this instant can STILL be struck by its
 // NEXT few degrees of opening (Garage FRONT at 0.858 -> 1.0). Account for
 // the actual rotating solid panel along the permitted future opening
 // range. The door motor remains authoritative and collision is unchanged.
 const start=door.openFraction??0;
 const finish=Math.max(start,Math.min(1.55,Math.max(1,door.pushTarget??1)));
 const futureLeafSegments=Array.from({length:13},(_,i)=>
  doorLeafSegment({...door,openFraction:start+(finish-start)*i/12}));
 let best:Pt|null=null,score=Infinity;
 for(const radius of [6,8,10,12]){
  for(let i=0;i<16;i++){
   const theta=i*Math.PI/8;
   const p={x:from.x+Math.cos(theta)*radius,
    y:from.y+Math.sin(theta)*radius};
   const clearance=pointToSegment(p,leaf);
   const futureGap=Math.min(...futureLeafSegments.map(leaf=>
     pointToSegment(p,leaf)));
   // Margin exceeds the motor's 1-unit precise-detour arrival tolerance;
   // the actual resting center must remain out of the predicted leaf sweep.
   if(clearance<OPERATOR_RADIUS+7||
      futureGap<OPERATOR_RADIUS+5||
      clearance<before+5||!canStand(p)||
      !fullBodyMotorStrideClear(from,p,sweep))continue;
   const setback=Math.max(0,distance(p,goal)-distance(from,goal));
   const rating=radius+setback*.35-(clearance-before)*.15;
   if(rating<score){score=rating;best=p;}
  }
  if(best)break; // smallest physically adequate departure first
 }
 return best;
}
