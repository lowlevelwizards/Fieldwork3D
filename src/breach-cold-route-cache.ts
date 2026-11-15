/** D3.17E6: short-lived negative A* query cache, never a navigation
 * veto. A failure is only evidence about THIS GO, actor anchor, real
 * world geometry and ALL current door poses. The normal motor still
 * checks pressure, obstruction and player orders every fixed tick.
 */
import type {TeamActor} from './breach-game.ts';
import type {Door,Pt} from './breach-core.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
type Negative={
 orderId:number;goal:Pt;anchor:Pt;revision:number;doorKey:string;
 failedAt:number
};
const witnesses=new WeakMap<TeamActor,Negative>();
/** Include REMOTE doors: a newly opened future portal can unblock a
 * route although this operator is still a room away from the hinge.
 * Called on cold A* attempts only; no per-tick global door scan.
 */
function allDoorPoseKey(doors:readonly Door[]):string{
 let key='';
 for(const d of doors)
  key+=d.id+':'+Math.round((d.openFraction??0)*20)+':'+
   (d.open?1:0)+':'+(d.locked?1:0)+':'+(d.jammed?1:0)+
   ':'+(d.wedged?1:0)+':'+(d.heldBy??'-')+'|';
 return key;
}
export function noteFailedRouteProbe(a:TeamActor,goal:Pt,seconds:number,
 revision:number,doors:readonly Door[]):void{
 const order=a.plan[0];
 if(order?.kind!=='move')return;
 witnesses.set(a,{orderId:order.id,anchor:{...a.p},goal:{...goal},
  revision,doorKey:allDoorPoseKey(doors),failedAt:seconds});
}
/** Never preemptively claim a route is impossible. Only suppress after
 * a genuinely failed A* attempt, for at most FOUR seconds. Recompute
 * immediately when any door, cover, order, destination, or body changes.
 */
export function shouldPauseNegativeGoalProbe(a:TeamActor,goal:Pt,
 seconds:number,revision:number,doors:readonly Door[]):boolean{
 const prior=witnesses.get(a),order=a.plan[0];
 return !!prior&&order?.kind==='move'&&prior.orderId===order.id&&
  distance(prior.goal,goal)<.5&&distance(prior.anchor,a.p)<3&&
  prior.revision===revision&&prior.doorKey===allDoorPoseKey(doors)&&
  seconds-prior.failedAt<4;
}
