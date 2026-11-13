/** D1: persistent doorway CROSSING CONTEXT, not a new motion controller.
 * Never writes authored orders, navigation, positions, hinges or collision.
 * D2 will consume one stable maneuver rather than search every motor tick.
 */
import {doorCenter,doorLeafSegment,pointToSegment,OPERATOR_RADIUS,
 type Door,type Pt} from './breach-core.ts';
import {crossingDoor} from './breach-passage.ts';
import type {TeamActor} from './breach-game.ts';

export type DoorManeuver='direct'|'push-through'|'outside-leaf'|'grab-and-hold';
export type DoorTraversalPhase='approach'|'open'|'clear-leaf'|
  'cross'|'release'|'blocked';
export type DoorTraversalEpisode={
 readonly doorId:string;
 readonly authoredOrderId:number;
 /** The original authored world-space target, never a motor nav correction. */
 readonly destination:Pt;
 readonly approachSide:-1|1;
 readonly startedAt:number;
 phase:DoorTraversalPhase;
 maneuver:DoorManeuver;
 lastProgressAt:number;
 lastPosition:Pt;
 lastTransitionAt:number;
 obstructionReason:string|null;
 /** D1 leaves both blank: no automated footwork or remote hand contact. */
 waypoints:Pt[];
 waypointIndex:number;
 handContact:boolean;
 /** D2 bounded maneuver attempts; no fresh route search every motor tick. */
 maneuverAttempts:number;nextManeuverAt:number;
};
const squared=(a:Pt,b:Pt)=>{
 const x=a.x-b.x,y=a.y-b.y;return x*x+y*y;
};
export function signedDoorSide(p:Pt,door:Door):number{
 const m=doorCenter(door),dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const width=Math.hypot(dx,dy)||1;
 return ((p.x-m.x)*-dy+(p.y-m.y)*dx)/width;
}
function candidate(actor:TeamActor,doors:readonly Door[],goal:Pt,
 explicitId?:string):Door|null{
 let best:Door|null=null,bestDistance=66*66;
 for(const door of doors){
  if(explicitId&&door.id!==explicitId)continue;
  const d=squared(actor.p,doorCenter(door));
  if(d>bestDistance)continue;
  if(!crossingDoor({id:actor.id,p:actor.p,goal,health:actor.health,
   blockedTime:actor.blockedTime,active:true},door))continue;
  if(!best||d<bestDistance||
     (d===bestDistance&&door.id<best.id)){
   best=door;bestDistance=d;
  }
 }
 return best;
}
/** One cheap fixed-tick observation. No new A*, swept collision, extra
 * search when an episode is already active or a distant actor is idle.
 * Probe only at 5Hz when no doorway has been acquired. */
export function syncDoorTraversalEpisode(
 actor:TeamActor,doors:readonly Door[],seconds:number
):DoorTraversalEpisode|null{
 const order=actor.plan[0];
 const eligible=actor.side==='blue'&&actor.health>0&&
  order&&(order.kind==='move'||order.kind==='pie');
 const episode=actor.doorTraversal;
 if(episode){
  if(!eligible||order.id!==episode.authoredOrderId||
     order.p.x!==episode.destination.x||order.p.y!==episode.destination.y){
   actor.doorTraversal=null;return null;
  }
  let door:Door|undefined;
  for(const d of doors)if(d.id===episode.doorId){door=d;break;}
  if(!door){actor.doorTraversal=null;return null;}
  if(squared(actor.p,episode.lastPosition)>2.25){
   episode.lastPosition={...actor.p};
   episode.lastProgressAt=seconds;
  }
  const side=signedDoorSide(actor.p,door)*episode.approachSide;
  let phase:DoorTraversalPhase;
  if(side<=-(OPERATOR_RADIUS+8))phase='release';
  else if(!door.open||(door.openFraction??0)<.72)phase='open';
  else if(pointToSegment(actor.p,doorLeafSegment(door))<
    OPERATOR_RADIUS+9)phase='clear-leaf';
  else phase=side>=0?'approach':'cross';
  if(actor.blockedTime>2.5&&seconds-episode.lastProgressAt>2.5){
   phase='blocked';episode.obstructionReason=actor.lastBlocker;
  }else episode.obstructionReason=null;
  if(phase!==episode.phase){
   episode.phase=phase;episode.lastTransitionAt=seconds;
  }else if(phase==='release'&&seconds-episode.lastTransitionAt>1/120){
   actor.doorTraversal=null;return null;
  }
  return episode;
 }
 if(!eligible)return null;
 if(seconds-actor.doorTraversalLastProbeAt<.2)return null;
 actor.doorTraversalLastProbeAt=seconds;
 const door=candidate(actor,doors,order.p,order.entryDoorId);
 if(!door)return null;
 const side=signedDoorSide(actor.p,door);
 const fraction=door.openFraction??(door.open?1:0);
 const created:DoorTraversalEpisode={
  doorId:door.id,authoredOrderId:order.id,destination:{...order.p},
  approachSide:side>=0?1:-1,startedAt:seconds,
  phase:!door.open||fraction<.72?'open':'approach',
  maneuver:'direct',lastProgressAt:seconds,lastPosition:{...actor.p},
  lastTransitionAt:seconds,obstructionReason:null,
  waypoints:[],waypointIndex:0,handContact:false,
  maneuverAttempts:0,nextManeuverAt:seconds
 };
 actor.doorTraversal=created;
 return created;
}
