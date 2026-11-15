/** D3.14D2: physical evidence before escaping a repeated, open-leaf D2
 * rehearsal -> stale-intel -> rehearsal cycle. Route selection only:
 * never teleports, opens a hinge, edits GO/PlanNode or relaxes a sweep.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';

const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
type Witness={
 orderId:number;doorId:string;goal:Pt;anchor:Pt;
 leafFraction:number;bestRemaining:number;lastAt:number;
 count:number;attempted:boolean
};
const witnesses=new WeakMap<TeamActor,Witness>();

/** Invoke ONLY after the ordinary D2 motor accepted an actual swept
 * outside-leaf rehearsal. Repeated same-tick callbacks cannot count.
 * Real goalward displacement, changed door, hinge, GO or PlanNode resets.
 * One cold full-route proposal per unchanged physical cycle anchor.
 */
export function shouldProbeRepeatedDoorRehearsal(
 a:TeamActor,goal:Pt,doorId:string,leafFraction:number,seconds:number
):boolean{
 const order=a.plan[0];
 if(a.side!=='blue'||order?.kind!=='move'||order.entryDoorId||
    distance(order.p,goal)>.5||a.squeeze)return false;
 const remaining=distance(a.p,goal),prior=witnesses.get(a);
 const same=!!prior&&prior.orderId===order.id&&
   prior.doorId===doorId&&distance(prior.goal,goal)<.5&&
   distance(prior.anchor,a.p)<26&&
   Math.abs(prior.leafFraction-leafFraction)<.13&&
   seconds-prior.lastAt<9&&
   remaining>=prior.bestRemaining-10;
 if(!same){
   witnesses.set(a,{orderId:order.id,doorId,goal:clone(goal),
     anchor:clone(a.p),leafFraction,bestRemaining:remaining,lastAt:seconds,
     count:1,attempted:false});
   return false;
 }
 // Ignore repeated callbacks inside a single physical episode/frame.
 if(seconds-prior.lastAt<.55)return false;
 prior.count=Math.min(4,prior.count+1);
 prior.lastAt=seconds;
 prior.bestRemaining=Math.min(prior.bestRemaining,remaining);
 if(prior.count<3||prior.attempted)return false;
 prior.attempted=true;
 return true;
}

/** One cold world-truth A* proposal, accepted only if *every* leg is
 * swept clear for a full-size body and the tail ends at the real GO.
 * All later 60 Hz steps remain governed by existing live collision.
 */
export function fullySweptRehearsalExit(
 from:Pt,goal:Pt,route:readonly Pt[],
 sweep:(from:Pt,to:Pt)=>boolean
):Pt[]{
 if(!route.length||distance(from,goal)<30||
    distance(route[route.length-1],goal)>3)return [];
 let at=from,length=0;
 for(const point of route){
   const span=distance(at,point);
   if(!Number.isFinite(span)||!sweep(at,point))return [];
   length+=span;at=point;
 }
 if(length>distance(from,goal)*1.9+48)return [];
 return route.map(clone);
}
