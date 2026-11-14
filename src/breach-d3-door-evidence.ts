/** D3.2 offline forensic witness; NEVER imported by a live motor or renderer. */
import {doorCenter,doorLeafSegment,pointToSegment,OPERATOR_RADIUS} from './breach-core.ts';
import {doorSwingBlocked,doorWouldStrikeActors} from './breach-door.ts';
import {bodyClear,sweptBodyClear} from './breach-navigation.ts';
import {selectedD32MotorDoor} from './breach-d3-motor-door-witness.ts';
import {probeD32HingeSelfClearance} from './breach-d3-hinge-escape-evidence.ts';
import {routeWithSqueezeWorld,routeWithSqueezeIntel} from './breach-squeeze-route.ts';
import {diagnoseMovement} from './breach-nav-diagnostics.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import type {Session,TeamActor} from './breach-game.ts';
const pos=(p:{x:number;y:number}|undefined)=>p?{x:+p.x.toFixed(2),y:+p.y.toFixed(2)}:null;
const round=(x:number)=>+x.toFixed(3);
export const D32_HOLD_MILESTONES=[.75,1.5,3,6,12] as const;
/** Forensic thresholds on preexisting motor.blockedTime, not a live clock. */
export const D32_BLOCK_MILESTONES=[.85,1.7,3.4,6.8] as const;
export function dueD32BlockMilestones(age:number,mask:number):number[]{
 const due:number[]=[];
 for(let i=0;i<D32_BLOCK_MILESTONES.length;i++)
  if(!(mask&(1<<i))&&age>=D32_BLOCK_MILESTONES[i])due.push(i);
 return due;
}
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
  selectedDoorId:selectedD32MotorDoor(a,s.seconds),
  order:order?.kind??null,orderId:order?.id??null,goal:pos(order?.p),
  next:pos(a.nav[0]),navLength:a.nav.length,motorPause:a.motorPause,
  nextWaypointSweptClear:!!a.nav[0]&&
    sweptBodyClear(a.p,a.nav[0],s.doors,OPERATOR_RADIUS,world),
  blockedTime:round(a.blockedTime),actionTimer:round(a.actionTimer),
  retries:a.recoveryAttempts,blocker:a.lastBlocker,
  retryRouteAt:round(a.retryRouteAt),lastNavRepairAt:round(a.lastNavRepairAt),
  routeGoalKey:a.routeGoalKey,
  traversal:a.doorTraversal?{doorId:a.doorTraversal.doorId,
    phase:a.doorTraversal.phase,maneuver:a.doorTraversal.maneuver}:null,doors};
}

/** Recompute normal recovery candidates ONLY in the offline generated audit
 * after a sustained physical stall. This does not replace the live route.
 * All simulations and true collision tests are unchanged. */
/** Extra bounded forensic probe only for the ACTUAL sustained door
 * collision milestone. Never used during ordinary execution. */
export function captureD32SelfBlockingHinge(a:TeamActor,s:Session){
 const world=sessionWorldGeometry(s);
 const door=s.doors.find(d=>(d.openFraction??0)>=.15&&
    (d.openFraction??0)<.72&&d.open&&
    pointToSegment(a.p,doorLeafSegment(d))<OPERATOR_RADIUS+27&&
    doorWouldStrikeActors(d,Math.min(1,(d.openFraction??0)+.025),
      [a.p],OPERATOR_RADIUS));
 if(!door)return null;
 const others=s.operators.filter(b=>b!==a&&b.health>0);
 const goal=a.plan[0]?.p??a.p;
 return {doorId:door.id,hinge:door.hinge,swing:door.swing,
  a:pos(door.a),b:pos(door.b),fraction:round(door.openFraction??0),
  leaf:doorLeafSegment(door),selfBlocking:true,
  otherBlocking:others.filter(b=>doorWouldStrikeActors(door,
    Math.min(1,(door.openFraction??0)+.025),[b.p],OPERATOR_RADIUS))
   .map(b=>({id:b.id,p:pos(b.p)})),
  options:probeD32HingeSelfClearance(a.p,goal,door,
    others.map(b=>b.p),(from,to)=>
      sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world))
 };
}
export function captureD32RecoveryFeasibility(a:TeamActor,s:Session){
 const goal=a.plan[0]?.p;
 if(!goal)return null;
 const world=sessionWorldGeometry(s);
 const worldRoute=routeWithSqueezeWorld(a.p,goal,s.doors,world);
 // R2.5: offline witness only, not a route command. Distinguish a
 // blocked snapped start from a truly disconnected goal by testing
 // short exact-swept feet positions and routing from that real point.
 const stableOpenLeafNear=!worldRoute.length&&s.doors.some(door=>
   door.open&&(door.openFraction??0)>=.95&&
   pointToSegment(a.p,doorLeafSegment(door))<OPERATOR_RADIUS+6);
 const localCandidates=[];
 if(stableOpenLeafNear){
  const heading=Math.atan2(goal.y-a.p.y,goal.x-a.p.x);
  for(const length of [8,16])
   for(const turn of [0,Math.PI/4,-Math.PI/4]){
    const angle=heading+turn,point={x:a.p.x+Math.cos(angle)*length,
     y:a.p.y+Math.sin(angle)*length};
    if(!sweptBodyClear(a.p,point,s.doors,OPERATOR_RADIUS,world)){
     localCandidates.push({length,turn,clear:false,routeCount:0});
     continue;
    }
    const newRoute=routeWithSqueezeWorld(point,goal,s.doors,world);
    localCandidates.push({length,turn,clear:true,
     point:pos(point),routeCount:newRoute.length,
     next:pos(newRoute[0]),nextClear:newRoute[0]?
      sweptBodyClear(point,newRoute[0],s.doors,OPERATOR_RADIUS,world):
      null});
   }
 }
 const intelRoute=a.side==='blue'?
   routeWithSqueezeIntel(s.intel,a.p,goal):[];
 const firstWorld=worldRoute[0],firstIntel=intelRoute[0];
 const firstActual=a.nav[0];
 const clearance=(p:typeof a.p|undefined)=>p?{
  swept:sweptBodyClear(a.p,p,s.doors,OPERATOR_RADIUS,world),
  cause:diagnoseMovement(a.p,p,s.doors,[],OPERATOR_RADIUS,world).blocker,
  distance:round(Math.hypot(a.p.x-p.x,a.p.y-p.y))
 }:null;
 const cover=world.cover.filter(o=>Math.hypot(o.x-a.p.x,o.y-a.p.y)<75)
   .sort((a,b)=>Math.hypot(a.x-goal.x,a.y-goal.y)-
      Math.hypot(b.x-goal.x,b.y-goal.y))
   .slice(0,5).map(o=>({id:o.id??null,fixture:o.fixture??null,
     x:round(o.x),y:round(o.y),w:round(o.w),h:round(o.h)}));
 // Endpoint accessibility is independent of route connectivity.
 // Without these flags, repeated empty A* routes cannot distinguish an
 // impossible authored goal from disconnected world portals.
 const endPoint={
  actorWorldPassable:world.passable(a.p,OPERATOR_RADIUS),
  actorBodyClear:bodyClear(a.p,s.doors,OPERATOR_RADIUS,world),
  goalWorldPassable:world.passable(goal,OPERATOR_RADIUS),
  goalBodyClear:bodyClear(goal,s.doors,OPERATOR_RADIUS,world),
  snappedActor:pos({x:Math.round(a.p.x/16)*16,
    y:Math.round(a.p.y/16)*16}),
  snappedGoal:pos({x:Math.round(goal.x/16)*16,
    y:Math.round(goal.y/16)*16})
 };
 return {goal:pos(goal),endPoint,currentFirst:pos(firstActual),
  current:clearance(firstActual),worldCount:worldRoute.length,
  worldFirst:pos(firstWorld),worldClear:clearance(firstWorld),
  localProbeEligible:stableOpenLeafNear,
  localProbe:localCandidates,
  intelCount:intelRoute.length,intelFirst:pos(firstIntel),
  intelClear:clearance(firstIntel),cover};
}
