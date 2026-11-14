/** D3.9A — one door manipulator, independent of passage right-of-way.
 * Acquire on actual opening intent BEFORE bodies crowd the hinge.
 * This grants no movement, collision, navigation or authored-order authority.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {Door} from './breach-core.ts';
import {doorCenter} from './breach-core.ts';
import {doorReachable} from './breach-door.ts';
import {activeDoorCrossingIntent} from './breach-door-pressure-arbitration.ts';

type Lease={actorId:string;orderId:number;lastIntentAt:number};
const owners=new WeakMap<Session,Map<string,Lease>>();
const sq=(a:{x:number;y:number},b:{x:number;y:number})=>
 (a.x-b.x)**2+(a.y-b.y)**2;
const operable=(d:Door)=>d.kind!=='sliding'&&d.kind!=='shutter'&&
 !d.wedged&&!d.locked&&!d.jammed&&!d.heldBy;
const finished=(d:Door)=>(d.openFraction??0)>=
 Math.max(1,d.pushTarget??1)-.03;
/** Eligibility is the CURRENT, local door operation, not a past episode
 * or a remote goal. An explicit door opener is actionable only in reach.
 */
function candidate(a:TeamActor,d:Door,requireReach:boolean):boolean{
 if(a.side!=='blue'||a.health<=0||a.surrendered||!a.plan.length)return false;
 const order=a.plan[0];
 if(order.kind==='door'){
  if(order.doorId!==d.id||
     (order.method!=='open'&&order.method!=='kick'&&order.method!==undefined))
   return false;
 }else if(order.kind==='move'||order.kind==='pie'){
  if(a.doorTraversal?.doorId!==d.id||
      a.doorTraversal.authoredOrderId!==order.id){
   if(order.entryDoorId!==d.id&&!activeDoorCrossingIntent(a,d))
    return false;
  }
 }else return false;
 if(sq(a.p,doorCenter(d))>84*84)return false;
 return !requireReach||doorReachable(a.p,d);
}
/** Retain an opener briefly after its explicit OPEN node completes while
 * the already-moving leaf catches up; do not claim a new remote door order.
 */
function stillOwns(a:TeamActor,d:Door,lease:Lease,now:number):boolean{
 if(a.side!=='blue'||a.health<=0||a.surrendered||
    sq(a.p,doorCenter(d))>96*96)return false;
 if(a.plan[0]?.id===lease.orderId)
   return candidate(a,d,false);
 return d.open&&(d.openFraction??0)>.08&&
   !finished(d)&&now-lease.lastIntentAt<1.25&&
   a.plan[0]?.kind!=='door';
}
/** A null owner means normal, uncontested door interaction remains legal.
 * In particular, a lone actor must never lose its physical hand assist.
 * Existing lease is stable across motor callbacks, actor reordering, and
 * ordinary small foot movements.
 */
export function implicitDoorOpeningOwner(s:Session,d:Door):string|null{
 let map=owners.get(s);
 if(!operable(d)||finished(d)){
  map?.delete(d.id);return null;
 }
 if(!map){map=new Map();owners.set(s,map);}
 const previous=map.get(d.id);
 if(previous){
  const prior=s.operators.find(a=>a.id===previous.actorId);
  if(prior&&stillOwns(prior,d,previous,s.seconds)){
   if(prior.plan[0]?.id===previous.orderId)
    previous.lastIntentAt=s.seconds;
   return prior.id;
  }
  map.delete(d.id);
 }
 let chosen:TeamActor|null=null,score=Infinity,contenders=0;
 const center=doorCenter(d);
 for(const a of s.operators){
  if(!candidate(a,d,true))continue;
  contenders++;
  // An actual hand already grasping the panel wins over another nearby
  // implicit crossing. Otherwise explicit OPEN/KICK takes precedence.
  const grip=a.doorHandContact?.doorId===d.id&&
   a.doorHandContact.releasedAt===null;
  const explicit=a.plan[0]?.kind==='door';
  const value=(grip?0:explicit?10000:20000)+sq(a.p,center);
  if(value<score||value===score&&chosen&&a.id<chosen.id){
   chosen=a;score=value;
  }
 }
 // No arbitration needed for a lone operator. Preserve the ordinary
 // motor and hand path without creating a pointless traffic checkpoint.
 if(contenders<2||!chosen)return null;
 map.set(d.id,{actorId:chosen.id,
  orderId:chosen.plan[0].id,lastIntentAt:s.seconds});
 return chosen.id;
}
/** The opening lease limits manipulation only, never physical passage. */
export function mayManipulateOpening(s:Session,a:TeamActor,d:Door):boolean{
 const owner=implicitDoorOpeningOwner(s,d);
 return !owner||owner===a.id;
}
/** A follower must avoid the active partial swing, but may still walk
 * wherever the physical motor and existing passage queue permit.
 */
export function shouldStageForOpening(s:Session,a:TeamActor,d:Door):boolean{
 if(!operable(d)||(d.openFraction??0)>=.72||a.side!=='blue'||
    (a.plan[0]?.kind!=='move'&&a.plan[0]?.kind!=='pie'))return false;
 const owner=implicitDoorOpeningOwner(s,d);
 return !!owner&&owner!==a.id;
}
