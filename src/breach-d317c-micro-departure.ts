/** D3.17C: cold, bounded physical departure from a proven furniture loop.
 * No 60Hz scanning, collision exceptions, unobserved route learning,
 * teleports, extra authored orders or automatic goal completion.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
import {fullBodyMotorStrideClear} from './breach-stack-micro-corner.ts';
import {fullBodyMotorRouteClear,joinsExistingMotorRoute} from './breach-recovery-route-validation.ts';

const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt):Pt=>({x:p.x,y:p.y});
type Witness={
 orderId:number;goal:Pt;next:Pt;anchor:Pt;bestRemaining:number;
 lastAt:number;consecutive:number;attempts:number;retryAfter:number
};
const witnesses=new WeakMap<TeamActor,Witness>();

/** Called ONLY after a real furniture collision escalates to a world-route
 * repair. Three distinct replan episodes at the same anchor and first nav
 * node without actual GO progress permit at most two cold probes per order.
 */
export function claimRepeatedFurnitureDeparture(
 a:TeamActor,goal:Pt,next:Pt,seconds:number):boolean{
 const order=a.plan[0];
 if(a.side!=='blue'||order?.kind!=='move'||a.squeeze||
    a.doorTraversal||a.traversal||a.traversalPending||
    a.lastBlocker!=='furniture'||a.blockedTime<.3)return false;
 const old=witnesses.get(a),remaining=distance(a.p,goal);
 const same=old&&old.orderId===order.id&&
  distance(old.goal,goal)<.5&&distance(old.next,next)<3&&
  distance(old.anchor,a.p)<3&&remaining>=old.bestRemaining-3&&
  seconds-old.lastAt<6;
 if(!same){
  witnesses.set(a,{orderId:order.id,goal:clone(goal),next:clone(next),
   anchor:clone(a.p),bestRemaining:remaining,lastAt:seconds,
   consecutive:1,attempts:0,retryAfter:0});
  return false;
 }
 // A repeated call within one physical contact does not create evidence.
 if(seconds-old.lastAt<.65)return false;
 old.lastAt=seconds;
 old.consecutive=Math.min(5,old.consecutive+1);
 old.bestRemaining=Math.min(old.bestRemaining,remaining);
 if(old.consecutive<3||old.attempts>=2||seconds<old.retryAfter)
   return false;
 old.attempts++;
 old.retryAfter=seconds+3.5;
 return true;
}

/** At most 16 local, full-capsule microstride-verified departure stages.
 * Prefer joining the CURRENT transient path without any A*. Only if those
 * fail, spend up to FOUR cold physical world-route searches. Every leg,
 * including the first subunit stride and the final GO, must be full-body
 * swept; the runtime collision motor validates again at execution time.
 */
export function selectMotorVerifiedFurnitureDeparture(
 from:Pt,goal:Pt,existing:readonly Pt[],
 sweep:(a:Pt,b:Pt)=>boolean,
 worldRoute:(a:Pt,b:Pt)=>Pt[]
):Pt[]{
 if(!existing.length||distance(from,goal)<10)return [];
 const first=existing[0];
 if(distance(from,first)<4||
    fullBodyMotorStrideClear(from,first,sweep))return [];
 const dx=first.x-from.x,dy=first.y-from.y;
 const heading=Math.atan2(dy,dx);
 const candidates:Pt[]=[];
 // Perpendicular first to escape the same collided chord; then diagonals.
 for(const radius of [4,8])
  for(const angle of [Math.PI/2,-Math.PI/2,
      3*Math.PI/4,-3*Math.PI/4,Math.PI/4,-Math.PI/4,Math.PI,0]){
   const theta=heading+angle;
   const stage={x:from.x+Math.cos(theta)*radius,
    y:from.y+Math.sin(theta)*radius};
   if(!fullBodyMotorStrideClear(from,stage,sweep))continue;
   candidates.push(stage);
   const proposal=[stage,...existing];
   if(physicallyContinuous(from,goal,proposal,sweep))
     return proposal.map(clone);
  }
 // D3.18C: reconnect at an existing disposable node when an
 // intervening unopened door makes a full GO route impossible. A suffix
 // is NOT certified as passable: later doors remain owned by the motor.
 // Check direct joins first (zero searches), then spend at most TWO
 // cold world searches on a promising intermediate join.
 const indices=[1,2,3,4].filter(i=>i<existing.length-1);
 const maxTravel=distance(from,goal)*2+48;
 for(const stage of candidates){
  for(const i of indices){
   const node=existing[i];
   if(distance(stage,node)>90)continue;
   const joined=joinsExistingMotorRoute(from,goal,existing,i,
    [stage,node],sweep,maxTravel);
   if(joined.length)return joined;
  }
 }
 let searches=0;
 for(const stage of candidates.slice(0,4)){
  for(const i of indices){
   const node=existing[i];
   if(distance(stage,node)>90||searches>=2)continue;
   searches++;
   const tail=worldRoute(stage,node);
   const joined=joinsExistingMotorRoute(from,goal,existing,i,
    [stage,...tail],sweep,maxTravel);
   if(tail.length&&joined.length)return joined;
  }
  if(searches>=2)break;
 }
 // Keep the original full-GO recovery, but never exceed the existing
 // four-A* budget shared with the intermediate connector attempts.
 for(const stage of candidates.slice(0,4)){
  if(searches>=4)break;
  searches++;
  const tail=worldRoute(stage,goal);
  if(!tail.length||distance(tail.at(-1)!,goal)>3)continue;
  const proposed=[stage,...tail];
  if(physicallyContinuous(from,goal,proposed,sweep))
   return proposed.map(clone);
 }
 return [];
}
function physicallyContinuous(from:Pt,goal:Pt,route:readonly Pt[],
 sweep:(a:Pt,b:Pt)=>boolean):boolean{
 return !!route.length&&distance(route.at(-1)!,goal)<=3&&
   fullBodyMotorRouteClear(from,route,sweep,distance(from,goal)*2+48);
}
