/** M2.8: real-motor-safe, cold local departure for a generated entry
 * already stuck while squeezing. No position, door, order or clearance
 * mutations; any selected route still runs through the normal motor.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import {fullBodyMotorStrideClear}
 from './breach-stack-micro-corner.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const attempts=new WeakMap<TeamActor,{
 orderId:number;goal:Pt;anchor:Pt;lastAt:number;count:number
}>();
/** Only one attempt from the same actual anchor. A second requires a
 * genuinely changed physical center, and neither attempt runs on 60Hz. */
export function claimM2EntrySqueezeProbe(
 a:TeamActor,goal:Pt,seconds:number):boolean{
 const order=a.plan[0];
 if(a.side!=='blue'||order?.kind!=='move'||!order.entryDoorId||
    !a.squeeze||a.doorTraversal||a.traversal||a.traversalPending||
    a.fireRetreatTarget||a.blockedTime<2||
    (a.lastBlocker!=='wall'&&a.lastBlocker!=='furniture')||
    !Number.isFinite(seconds)||!Number.isFinite(goal.x)||
    !Number.isFinite(goal.y)||distance(a.p,goal)<16)return false;
 let w=attempts.get(a);
 if(!w||w.orderId!==order.id||distance(w.goal,goal)>.5){
  w={orderId:order.id,goal:{...goal},anchor:{...a.p},
   lastAt:-Infinity,count:0};attempts.set(a,w);
 }
 // A closed/moving leaf may make the FIRST physically swept cold route
 // empty. Permit exactly one delayed stationary re-probe after four real
 // seconds; further probes require actual relocation and the same cap.
 if(w.count>=3||seconds-w.lastAt<4||
    (w.count>=2&&distance(a.p,w.anchor)<4))return false;
 w.lastAt=seconds;w.count++;w.anchor={...a.p};
 return true;
}
/** Up to four cold route probes. Certified FULL body departure, then the
 * next real narrow-profile microstep. Ordinary motor rechecks ALL steps. */
export function selectM2EntrySqueezeDeparture(
 from:Pt,goal:Pt,blockedNext:Pt,
 fullSweep:(a:Pt,b:Pt)=>boolean,
 narrowSweep:(a:Pt,b:Pt)=>boolean,
 worldRoute:(a:Pt,b:Pt)=>readonly Pt[]
):Pt[]{
 if(![from.x,from.y,goal.x,goal.y,blockedNext.x,blockedNext.y]
   .every(Number.isFinite)||distance(from,goal)<16)return [];
 const toward=Math.atan2(blockedNext.y-from.y,blockedNext.x-from.x);
 const headings=Array.from({length:8},(_,i)=>i*Math.PI/4);
 headings.sort((a,b)=>Math.abs(Math.atan2(Math.sin(a-toward),
  Math.cos(a-toward)))-Math.abs(Math.atan2(Math.sin(b-toward),
  Math.cos(b-toward))));
 let searches=0;
 for(const radius of [2,4,8])for(const theta of headings){
  const stage={x:from.x+Math.cos(theta)*radius,
   y:from.y+Math.sin(theta)*radius};
  // The operator is ALREADY in an approved squeeze pose. A full-body
  // microstride may be physically impossible at this narrow starting
  // center; require the SAME exact 0.3-unit oriented squeeze sweep that
  // the existing motor will use to execute the transient stage.
  if(!fullBodyMotorStrideClear(from,stage,fullSweep)&&
     !fullBodyMotorStrideClear(from,stage,narrowSweep))continue;
  // An actor held at zero velocity restarts with a ~0.026-unit stride,
  // not the .3-unit substep of the route verifier. A wider swept chord
  // can clear a corner even when a TINY first displacement does not.
  // Reject that direction now; never require an illegal first tick or
  // repeatedly reissue a visually valid but physically useless path.
  const firstFraction=Math.min(.026,radius)/radius;
  const firstStep={x:from.x+(stage.x-from.x)*firstFraction,
   y:from.y+(stage.y-from.y)*firstFraction};
  if(!narrowSweep(from,firstStep)&&!fullSweep(from,firstStep))continue;
  if(++searches>4)return [];
  const tail=worldRoute(stage,goal);
  if(!tail.length||distance(tail.at(-1)!,goal)>3)continue;
  const first=tail[0];
  const length=distance(stage,first);
  if(!Number.isFinite(length)||length<.001)continue;
  const fraction=Math.min(.3,length)/length;
  const test={x:stage.x+(first.x-stage.x)*fraction,
   y:stage.y+(first.y-stage.y)*fraction};
  if(!narrowSweep(stage,test))continue;
  const projected=distance(from,stage)+
   tail.reduce((sum,p,i)=>sum+distance(i?tail[i-1]:stage,p),0);
  if(projected>distance(from,goal)*4+180)continue;
  return [{...stage},...tail.map(p=>({...p}))];
 }
 return [];
}
