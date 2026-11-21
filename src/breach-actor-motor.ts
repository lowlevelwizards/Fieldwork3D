import {sessionWorldGeometry} from './breach-world-context.ts';
/** Roadmap 2 Stage 7: narrow authoritative motor coordinator.
 * Called only from breach-game's fixed 60 Hz session step. It owns no
 * global clock, doesn't change authored orders, and never touches rendering.
 */
import {OPERATOR_RADIUS,pointToSegment,doorLeafSegment,type Pt} from './breach-core.ts';
import {sweptBodyClear,bodyClear,sweptProfileClear,squeezeFacing,
 twoSidedSqueezePressure} from './breach-navigation.ts';
import {approachingNarrowThreshold} from './breach-passage.ts';
import {boundedMotorCornerLookahead} from './breach-motor-cornering.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {openingYieldBudget,commitOpeningYield,MAX_OPENING_YIELD_TRAVEL}
 from './breach-passage-yield.ts';
import {noteQueueMotion} from './breach-queue-trace.ts';
import {witnessedGeneratedEntryStillness}
 from './breach-generated-entry-stillness.ts';
import {releaseEmbeddedMotorActor} from './breach-locomotion-clearance.ts';
import {localDetourWaypointTolerance,completePreciseLocalDetour}
 from './breach-motor-local-detour.ts';
import {sampleActorMotorStride} from './breach-actor-motor-stride.ts';
import {advanceMotorTraversal,prepareMotorTraversal}
 from './breach-motor-traversal.ts';
import {prepareMotorRoute} from './breach-motor-route.ts';
import {negotiateMotorPassage} from './breach-motor-passage.ts';
import {handleMotorDoor} from './breach-motor-door.ts';
import {resolveMotorCollision} from './breach-motor-collision.ts';
import {d,angle,type ActorMotorHooks} from './breach-motor-contract.ts';
import {syncDoorTraversalEpisode} from './breach-door-traversal-episode.ts';
import {ownsD326FineMotorRoute} from './breach-d326-fine-route-gate.ts';
import {recoverDoorApproachDrift,preferShortPhysicalEntry} from './breach-door-traversal-maneuver.ts';
import {beginMotorCpuMeasurement,finishMotorCpuMeasurement}
 from './breach-motor-cpu-probe.ts';

/** D3.33 P5: physical yield from one GENERATED zero-duration WAIT whose
 * already-open threshold's stalled lead is genuinely overlapping this
 * follower. The same fixed-step authoritative motor owns every movement;
 * neither generated WAIT nor next authored ENTRY is edited or completed.
 * The normal 8-unit body is preferred. Squeeze is legal only with actual
 * two-sided pressure and the existing three-sample oriented collision.
 *
 * Unlike ordinary rank/spacing holds, the specific blocker already sits
 * inside the lead's physical body. The follower, never the lead's arrival
 * counter, moves by <=0.55 units at 60Hz to release the overlap.
 */
export function relieveGeneratedEntryWaitCollision(
 s:Session,a:TeamActor,n:PlanNode,dt:number
):boolean{
 if(n.kind!=='wait'||n.duration!==0||!n.doorId||
    a.side!=='blue'||a.health<=0||a.stopped||
    a.plan[0]?.id!==n.id||a.plan[1]?.kind!=='move'||
    a.plan[1].entryDoorId!==n.doorId||
    a.traversal||a.traversalPending||dt<=0)return false;
 const leaf=s.doors.find(d=>d.id===n.doorId&&
   d.open&&!d.locked&&!d.jammed&&!d.wedged&&!d.heldBy&&
   (d.openFraction??0)>=.95&&Math.abs(d.angularVelocity??0)<.16);
 if(!leaf||openingYieldBudget(s,leaf,a.id)<.55)return false;
 const d=(x:Pt,y:Pt)=>Math.hypot(x.x-y.x,x.y-y.y);
 const priorYield=openingYieldBudget(s,leaf,a.id)<
   MAX_OPENING_YIELD_TRAVEL-.1;
 // After an ACTUAL initial overlap, create a small clearance margin for
 // Rook's next swept stride instead of stopping at exact body contact.
 const clearance=OPERATOR_RADIUS*2+(priorYield?4:1);
 const leaders=s.operators.filter(peer=>peer!==a&&peer.health>0&&
   peer.side===a.side&&peer.plan[0]?.kind==='move'&&
   peer.plan[0].entryDoorId===n.doorId&&
   peer.doorTraversal?.doorId===n.doorId&&
   d(a.p,peer.p)<clearance&&
   witnessedGeneratedEntryStillness(peer,leaf.id,s.seconds));
 if(!leaders.length)return false;
 leaders.sort((x,y)=>d(x.p,a.p)-d(y.p,a.p)||x.id.localeCompare(y.id));
 const lead=leaders[0],old={...a.p},world=sessionWorldGeometry(s);
 // Only an actual overlap at this same threshold, never a remote crowd.
 if(pointToSegment(lead.p,doorLeafSegment(leaf))>
    OPERATOR_RADIUS+25||d(old,lead.p)<.1)return false;
 const peers=s.operators.filter(peer=>peer!==a&&peer.health>0);
 const length=Math.min(.55,dt*35,openingYieldBudget(s,leaf,a.id));
 if(length<.1)return false;
 const away=Math.atan2(old.y-lead.p.y,old.x-lead.p.x);
 let target:Pt|null=null,profile:'normal'|'squeeze'='normal',yaw=0,
     score=-Infinity;
 for(const turn of [0,-Math.PI/4,Math.PI/4,-Math.PI/2,Math.PI/2,
   -Math.PI/8,Math.PI/8,-Math.PI*3/4,Math.PI*3/4,Math.PI]){
  const angle=away+turn;
  const proposed={x:old.x+Math.cos(angle)*length,
    y:old.y+Math.sin(angle)*length};
  const gain=d(proposed,lead.p)-d(old,lead.p);
  if(gain<.08)continue;
  const safelySeparated=peers.every(peer=>{
   const before=d(old,peer.p),after=d(proposed,peer.p);
   return before>=OPERATOR_RADIUS*2+1?
    pointToSegment(peer.p,{a:old,b:proposed})>=OPERATOR_RADIUS*2+1:
    after>before+.025;
  });
  if(!safelySeparated)continue;
  let p:'normal'|'squeeze'='normal';
  const rotated=squeezeFacing(angle);
  if(!sweptBodyClear(old,proposed,s.doors,OPERATOR_RADIUS,world)){
   if(!twoSidedSqueezePressure(old,proposed,s.doors,world)||
      !sweptProfileClear(old,proposed,s.doors,rotated,'squeeze',world))
     continue;
   p='squeeze';
  }
  const quality=gain-(p==='squeeze'?.07:0)-Math.abs(turn)*.03;
  if(quality>score){target=proposed;score=quality;profile=p;yaw=rotated;}
 }
 if(!target)return false;
 a.priorP=old;a.p=target;a.velocity=0;
 a.lastBlocker='clear';a.retryRouteAt=0;
 if(profile==='squeeze'){
  a.squeeze=true;a.squeezeYaw=yaw;
 }else if(bodyClear(target,s.doors,OPERATOR_RADIUS,world)){
  a.squeeze=false;a.squeezeTime=0;
 }
 commitOpeningYield(s,leaf,a.id,old,target);
 noteQueueMotion(s,a,'opening-leaf-yield',old,target,leaf.id);
 return true;
}

export function advanceActorMotor(
 a:TeamActor,p:Pt,dt:number,s:Session,hooks:ActorMotorHooks,
 speedScale=1,profile?:((section:string,elapsedMs:number)=>void)):boolean{
 // All marks are observational and gated behind the same opt-in simulation
 // profiler as the parent operator total. No additional work in normal play.
 // One authoritative observation before any route/door/queue early return.
 // No navigation or hinge force is produced by this D1 foundation.
 if(a.side==='blue')syncDoorTraversalEpisode(a,s.doors,s.seconds);
 const traversalStart=profile?beginMotorCpuMeasurement():0;
 // Do not interrupt a continuous physical traversal with route search.
 if(advanceMotorTraversal(a,s,dt,hooks)){
  if(profile)profile('motor-traversal',finishMotorCpuMeasurement(traversalStart));
  return true;
 }
 if(releaseEmbeddedMotorActor(a,p,s.doors,dt,sessionWorldGeometry(s),s.seconds)){
  if(profile)profile('motor-traversal',finishMotorCpuMeasurement(traversalStart));
  return true;
 }
 if(prepareMotorTraversal(a,p,dt,s,hooks)){
  if(profile)profile('motor-traversal',finishMotorCpuMeasurement(traversalStart));
  return true;
 }
 if(profile)profile('motor-traversal',finishMotorCpuMeasurement(traversalStart));

 // Recover an operator who wandered far sideways while still committed
 // to the same doorway. One full-radius swept staging correction per
 // episode; never touch authored LOOK/WATCH or the global route graph.
 if(a.side==='blue'&&recoverDoorApproachDrift(a,s))return true;
 const routeStart=profile?beginMotorCpuMeasurement():0;
 const readiness=prepareMotorRoute(a,p,dt,s,hooks);
 if(profile)profile('motor-route',finishMotorCpuMeasurement(routeStart));
 if(readiness==='handled')return true;
 if(readiness==='unavailable')return false;
 // Only generated ENTRY legs can replace an obviously inefficient
 // transient route with the proven shorter real swept doorway maneuver.
 preferShortPhysicalEntry(a,s,p);

 const strideStart=profile?beginMotorCpuMeasurement():0;
 // A maximum two-node lookahead reduces needless shallow steering.
 // Only transient grid nodes are skipped, never the authored MOVE, a
 // precise physical detour, or an active action/doorway choreography.
 // Every proposed chord needs the SAME full-radius world-truth sweep.
 const canSmoothGrid=a.nav.length>=2&&
   a.side==='blue'&&a.plan[0]?.kind==='move'&&
   !ownsD326FineMotorRoute(a)&&
   !a.plan[0]?.entryDoorId&&a.blockedTime<.2&&
   !a.squeeze&&!a.traversal&&!a.traversalPending&&
   !a.autoSidestep&&!a.aimInstruction&&!a.fireRetreatTarget&&
   a.doorTraversal?.maneuver!=='outside-leaf'&&
   localDetourWaypointTolerance(a,a.nav[0])===3&&
   !approachingNarrowThreshold(a.p,p,s.doors);
 const skipped=boundedMotorCornerLookahead(a.p,a.nav,canSmoothGrid,
   (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,
     sessionWorldGeometry(s)));
 for(let i=0;i<skipped;i++)a.nav.shift();
 const next=a.nav[0],gap=d(a.p,next);
 // A3.4's very short corrective destinations need a tighter *motor*
 // waypoint tolerance, not just the order executor's final tolerance.
 // The former 3-unit motor threshold discarded a 4-unit step after
 // scarcely any real movement, leaving an apparently chosen correction
 // with feet that barely moved. Ordinary authored routes retain 3 units.
 const correcting=!!a.fireRetreatTarget&&
   d(p,a.fireRetreatTarget)<.5;
 if(gap<(correcting?.9:localDetourWaypointTolerance(a,next))){
  completePreciseLocalDetour(a);
  a.nav.shift();
  if(profile)profile('motor-stride',finishMotorCpuMeasurement(strideStart));
  return false;
 }
 const direction=angle(a.p,next);
 const {canAutoSidestep,move:initialMove}=sampleActorMotorStride(
   a,s,p,direction,dt,gap,speedScale);
 if(profile)profile('motor-stride',finishMotorCpuMeasurement(strideStart));

 const passageStart=profile?beginMotorCpuMeasurement():0;
 const passage=negotiateMotorPassage(a,p,initialMove,dt,s,hooks);
 if(profile)profile('motor-passage',finishMotorCpuMeasurement(passageStart));
 if(passage.paused)return true;

 const doorStart=profile?beginMotorCpuMeasurement():0;
 const door=handleMotorDoor(a,p,next,passage.move,dt,s,hooks);
 if(profile)profile('motor-door',finishMotorCpuMeasurement(doorStart));
 if(door.paused)return true;

 const collisionStart=profile?beginMotorCpuMeasurement():0;
 const resolved=resolveMotorCollision(a,p,next,passage.move,dt,s,
   canAutoSidestep,door.closed,hooks,profile,door.clearingDoorId);
 if(profile)profile('motor-collision',finishMotorCpuMeasurement(collisionStart));
 return resolved;
}
