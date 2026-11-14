/** D3.2 offline forensic witness; NEVER imported by a live motor or renderer. */
import {doorCenter,doorLeafSegment,pointToSegment,OPERATOR_RADIUS} from './breach-core.ts';
import {doorSwingBlocked,doorWouldStrikeActors} from './breach-door.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import type {Session,TeamActor} from './breach-game.ts';
const pos=(p:{x:number;y:number}|undefined)=>p?{x:+p.x.toFixed(2),y:+p.y.toFixed(2)}:null;
const round=(x:number)=>+x.toFixed(3);
export const D32_HOLD_MILESTONES=[.75,1.5,3,6,12] as const;
export function dueDoorHoldMilestones(age:number,mask:number):number[]{
 const due:number[]=[];
 for(let i=0;i<D32_HOLD_MILESTONES.length;i++)
  if(!(mask&(1<<i))&&age>=D32_HOLD_MILESTONES[i])due.push(i);
 return due;
}
export function captureD32DoorEvidence(a:TeamActor,s:Session){
 const world=sessionWorldGeometry(s),order=a.plan[0];
 const bodies=s.operators.filter(o=>o.health>0).map(o=>o.p);
 const doors=s.doors.map(door=>{
  const center=doorCenter(door),leaf=doorLeafSegment(door);
  return {door,distance:Math.hypot(a.p.x-center.x,a.p.y-center.y),
   gap:pointToSegment(a.p,leaf)};
 }).filter(x=>x.distance<110||x.gap<40)
  .sort((x,y)=>x.gap-y.gap||x.door.id.localeCompare(y.door.id))
  .slice(0,3).map(({door,distance,gap})=>{
   const fraction=door.openFraction??(door.open?1:0);
   const angle=Math.min(1,fraction+.025);
   return {id:door.id,kind:door.kind,open:door.open,
    fraction:round(fraction),velocity:round(door.angularVelocity??0),
    locked:!!door.locked,held:!!door.heldBy,wedged:!!door.wedged,
    distance:round(distance),leafGap:round(gap),
    bodyStrike:doorWouldStrikeActors(door,angle,bodies,OPERATOR_RADIUS),
    staticSweepBlocked:doorSwingBlocked(door,angle,[],OPERATOR_RADIUS,world),
    worldOrBodyBlocks:doorSwingBlocked(door,angle,bodies,OPERATOR_RADIUS,world),
    blockers:s.operators.filter(o=>o.health>0&&
      doorWouldStrikeActors(door,angle,[o.p],OPERATOR_RADIUS))
      .map(o=>({id:o.id,position:pos(o.p),pause:o.motorPause,
       order:o.plan[0]?.kind??null,next:pos(o.nav[0])})),
    nextWaypointLeafGap:a.nav[0]?round(pointToSegment(a.nav[0],doorLeafSegment(door))):null};
  });
 return {time:round(s.seconds),actor:a.id,position:pos(a.p),
  order:order?.kind??null,orderId:order?.id??null,goal:pos(order?.p),
  next:pos(a.nav[0]),navLength:a.nav.length,motorPause:a.motorPause,
  nextWaypointSweptClear:!!a.nav[0]&&
    sweptBodyClear(a.p,a.nav[0],s.doors,OPERATOR_RADIUS,world),
  blockedTime:round(a.blockedTime),actionTimer:round(a.actionTimer),
  retries:a.recoveryAttempts,blocker:a.lastBlocker,
  traversal:a.doorTraversal?{doorId:a.doorTraversal.doorId,
    phase:a.doorTraversal.phase,maneuver:a.doorTraversal.maneuver}:null,doors};
}
