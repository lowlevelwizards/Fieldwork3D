/** D3.9 one implicit operator per partial hinged leaf.
 * The door motor, pressure arbitration and support hand consult ONE lease.
 * This does NOT own body motion, collision, entry order or authored plans.
 * An already-traversable aperture is never a queue checkpoint.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {Door} from './breach-core.ts';
import {doorCenter} from './breach-core.ts';
import {doorReachable} from './breach-door.ts';
import {activeDoorCrossingIntent} from './breach-door-pressure-arbitration.ts';

type Lease={actorId:string;orderId:number};
const owners=new WeakMap<Session,Map<string,Lease>>();
const sq=(a:{x:number;y:number},b:{x:number;y:number})=>
 (a.x-b.x)**2+(a.y-b.y)**2;
const partial=(d:Door)=>d.kind!=='sliding'&&d.kind!=='shutter'&&
 !d.wedged&&(d.openFraction??0)<.72;
function candidate(a:TeamActor,d:Door):boolean{
 if(a.side!=='blue'||a.health<=0||a.surrendered||!a.plan.length)return false;
 const order=a.plan[0];
 if(order.kind==='door'){
  if(order.doorId!==d.id||order.method==='close'||order.method==='hold')
   return false;
 }else if(order.kind==='move'||order.kind==='pie'){
  if(a.doorTraversal?.doorId!==d.id&&
     order.entryDoorId!==d.id&&!activeDoorCrossingIntent(a,d))
    return false;
 }else return false;
 const center=doorCenter(d);
 return sq(a.p,center)<84*84;
}
export function implicitDoorOpeningOwner(s:Session,d:Door):string|null{
 if(!partial(d)){
  owners.get(s)?.delete(d.id);
  return null;
 }
 let map=owners.get(s);
 if(!map){map=new Map();owners.set(s,map);}
 const previous=map.get(d.id);
 if(previous){
  const prior=s.operators.find(a=>a.id===previous.actorId);
  if(prior&&prior.plan[0]?.id===previous.orderId&&candidate(prior,d))
   return prior.id;
  map.delete(d.id);
 }
 const center=doorCenter(d);
 let best:TeamActor|null=null;
 let score=Infinity;
 for(const a of s.operators){
  if(!candidate(a,d)||!doorReachable(a.p,d))continue;
  const explicit=a.plan[0]?.kind==='door';
  const weight=explicit?0:100000;
  // Nearest usable shoulder to the physical frame gets first opening.
  // Deterministic IDs settle exact ties; a lease never shifts each tick.
  const value=weight+sq(a.p,center);
  if(value<score||value===score&&best&&a.id<best.id){
   best=a;score=value;
  }
 }
 if(!best)return null;
 map.set(d.id,{actorId:best.id,orderId:best.plan[0].id});
 return best.id;
}
/** Non-owners may still physically traverse once clear; never suppress
 * an explicitly ordered operation from its owner or stop unrelated doors. */
export function shouldStageForOpening(s:Session,a:TeamActor,d:Door):boolean{
 if(!partial(d)||a.side!=='blue'||
    (a.plan[0]?.kind!=='move'&&a.plan[0]?.kind!=='pie'))return false;
 const owner=implicitDoorOpeningOwner(s,d);
 return !!owner&&owner!==a.id;
}
