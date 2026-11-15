/** D3.14C2: prevent a real full-body detour returning to one physical
 * anchor indefinitely while an untouched authored MOVE remains active.
 * Route selection / witness only. Ordinary 60Hz actor collision executes
 * every subsequent step; no door, position, GO or watcher is overwritten.
 */
import type {Pt} from './breach-core.ts';
import type {TeamActor} from './breach-game.ts';
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clone=(p:Pt)=>({x:p.x,y:p.y});
type Cycle={
 orderId:number;doorId:string;goal:Pt;anchor:Pt;
 count:number;bestRemaining:number;attempted:boolean;
 lastAt:number;
 activeUntil:number;
};
const loops=new WeakMap<TeamActor,Cycle>();
/** Called only when a real blocked full-body step has already requested
 * an adopted local lane. Three repeated departures from a near-identical
 * anchor with no measurable GO progress authorize one cold alternative.
 */
export function shouldProbeCircularFullBodyLane(
 a:TeamActor,goal:Pt,doorId:string|null,seconds:number
):boolean{
 const order=a.plan[0];
 if(!doorId||order?.kind!=='move'||a.squeeze)return false;
 const prior=loops.get(a),remaining=distance(a.p,goal);
 const same=prior&&prior.orderId===order.id&&prior.doorId===doorId&&
  distance(prior.goal,goal)<.25&&
  distance(prior.anchor,a.p)<23&&
  seconds-prior.lastAt<8&&
  remaining>=prior.bestRemaining-12;
 if(!same){
  loops.set(a,{orderId:order.id,doorId,goal:clone(goal),
   anchor:clone(a.p),count:1,bestRemaining:remaining,
   lastAt:seconds,attempted:false,activeUntil:0});
  return false;
 }
 prior.count=Math.min(5,prior.count+1);
 prior.lastAt=seconds;
 prior.bestRemaining=Math.min(prior.bestRemaining,remaining);
 if(prior.count<3||prior.attempted)return false;
 prior.attempted=true;
 return true;
}
/** D3.15B2: a generated STACK MOVE is a real authored waypoint
 * BEFORE the team's synchronization barrier. It can repeatedly reissue
 * the same local full-body lane even without a doorway episode. Reuse
 * the same monotonic actor-scoped three-recurrence witness, keyed to the
 * stack door rather than pretending an open-leaf episode exists.
 */
export function shouldProbeDoorlessStackLane(
 a:TeamActor,goal:Pt,seconds:number
):boolean{
 const order=a.plan[0];
 if(a.side!=='blue'||a.doorTraversal||a.squeeze||
    order?.kind!=='move'||!order.stackDoorId||order.entryDoorId||
    distance(order.p,goal)>.25)return false;
 return shouldProbeCircularFullBodyLane(a,goal,'stack:'+order.stackDoorId,seconds);
}

/** The world-truth route to the CURRENT stack waypoint can differ from
 * the cyclic local lane even when a local first step is swept. One cold,
 * finite route adoption only after three actual source-level repetitions.
 * Check the first and EVERY later full capsule sweep and original
 * authored node, not the distant post-SYNC interior entry landing.
 */
export function sweptGoalRouteFromStackCycle(
 from:Pt,goal:Pt,route:readonly Pt[],
 sweep:(a:Pt,b:Pt)=>boolean
):Pt[]{
 if(!route.length||distance(from,goal)<15||
    distance(route[route.length-1],goal)>3)return [];
 let at=from,cost=0;
 for(const p of route){
  const step=distance(at,p);
  if(!Number.isFinite(step)||!sweep(at,p))return [];
  cost+=step;at=p;
 }
 if(cost>distance(from,goal)*1.85+36)return [];
 return route.map(clone);
}
/** A world A* queried at the identical loop anchor can select the
 * SAME cycling local lane. Never spend the one cold recovery budget on
 * that route. Inspect at most four nearby axis-aligned full-body stages,
 * derived from the actual repeated first lane (no map-specific axes,
 * seed-specific values or physics exceptions). Every leg and the original
 * stack GO are physically swept with the current world.
 */
export function alternateStackWorldRoute(
 from:Pt,goal:Pt,oldFirst:Pt,
 sweep:(a:Pt,b:Pt)=>boolean,worldRoute:(a:Pt,b:Pt)=>Pt[]
):Pt[]{
 const dx=oldFirst.x-from.x,dy=oldFirst.y-from.y;
 if(Math.hypot(dx,dy)<5||Math.hypot(dx,dy)>75)return [];
 const distinct=(route:readonly Pt[])=>
   route.length&&distance(route[0],oldFirst)>5;
 const direct=sweptGoalRouteFromStackCycle(from,goal,worldRoute(from,goal),sweep);
 if(direct.length&&distinct(direct))return direct;
 const stages=[
  {x:from.x+dx,y:from.y},
  {x:from.x,y:from.y+dy},
  {x:from.x+dx*1.4,y:from.y},
  {x:from.x,y:from.y+dy*1.4}
 ];
 for(const stage of stages){
  if(distance(from,stage)<4||distance(stage,oldFirst)<5||
     !sweep(from,stage))continue;
  const tail=worldRoute(stage,goal);
  const candidate=sweptGoalRouteFromStackCycle(
    from,goal,[clone(stage),...tail],sweep);
  if(candidate.length&&distinct(candidate))return candidate;
 }
 return [];
}
/** The recurring lane already points at a first FULL-BODY-SWEPT
 * departure that eventually revisits its starting cell. Explore only
 * two *opposite* nearby departure corners, each through the established
 * world-truth route planner. The first step and every proposed route
 * segment must be physically clear at THIS snapshot. Each motor frame
 * will check again. Last point must be the original authored GO.
 */
export function alternateFullBodyLaneFromCycle(
 from:Pt,goal:Pt,firstUnproductiveNode:Pt,
 sweep:(from:Pt,to:Pt)=>boolean,
 worldRoute:(from:Pt,to:Pt)=>Pt[]
):Pt[]{
 const dx=from.x-firstUnproductiveNode.x;
 const dy=from.y-firstUnproductiveNode.y;
 const size=Math.hypot(dx,dy);
 if(size<10||size>120||distance(from,goal)<50)return [];
 const ox=dx/size,oy=dy/size;
 const px=-oy,py=ox;
 let best:Pt[]=[],bestLength=Infinity;
 for(const side of [1,-1]){
  const stage={x:from.x+ox*20+px*side*12,
   y:from.y+oy*20+py*side*12};
  if(!sweep(from,stage))continue;
  const tail=worldRoute(stage,goal);
  if(!tail.length||distance(tail[tail.length-1],goal)>3)continue;
  let length=distance(from,stage),at=stage,valid=true;
  for(const point of tail){
   if(!sweep(at,point)){valid=false;break;}
   length+=distance(at,point);at=point;
  }
  if(!valid||length>distance(from,goal)*1.65+45||
     length>=bestLength)continue;
  bestLength=length;
  best=[clone(stage),...tail.map(clone)];
 }
 return best;
}
/** Route ownership guards ONLY unproductive full-body-lane replacement;
 * actual blocked movement and all other collision recovery remain active.
 * Lose ownership after 4s or 30 units of genuine displacement.
 */
export function noteCircularWorldRoute(
 a:TeamActor,seconds:number
):void{
 const state=loops.get(a);
 if(state)state.activeUntil=seconds+4;
}
export function ownsCircularWorldRoute(a:TeamActor,seconds:number):boolean{
 const state=loops.get(a);
 if(!state||seconds>=state.activeUntil)return false;
 if(distance(a.p,state.anchor)>30||
   a.plan[0]?.id!==state.orderId||
   distance(a.plan[0]?.p??state.goal,state.goal)>.25){
  loops.delete(a);return false;
 }
 return true;
}
