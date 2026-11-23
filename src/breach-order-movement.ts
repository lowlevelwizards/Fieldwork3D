import {failedGeneratedStackSyncMember}
 from './breach-generated-sync-dropout.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {escortWalkMultiplier} from './breach-civilian-mission.ts';
import {physicalEscortWalkMultiplier} from './breach-follow-physical-policy.ts';
import {openingFootwork} from './breach-door-opening-footwork.ts';
/** Stage 8: conditional locomotion, lasting WATCH/LOOK aim, PIE
 * progression and waypoint arrival. Motion is still delegated to the
 * authoritative Stage 7 physical motor.
 */
import {OPERATOR_RADIUS,pointToSegment,doorLeafSegment,doorCenter,
 type Pt,type Door} from './breach-core.ts';
import {doorReachable} from './breach-door.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {targetAngle,interruptsWatch} from './breach-plan.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {friendlyArrivalSettleTarget,nearOccupiedFriendlyGoal}
 from './breach-friendly-traffic.ts';
import {entryClearanceForLook} from './breach-entry-coordination.ts';
import {selectPhysicalEntrySettle} from './breach-entry-target-settle.ts';
import {recordCompletedGeneratedEntry,clearCompletedEntryOnNewOrder}
 from './breach-completed-entry-leaf-yield.ts';
import {bodyClear} from './breach-navigation.ts';
import {routeWithNormalWorld} from './breach-squeeze-route.ts';
import {setTransientRoute} from './breach-route-transition.ts';
import {provisionalRouteAccepted} from './breach-movement-recovery.ts';
import {autoSidestepFacing} from './breach-auto-sidestep.ts';
import {approachingNarrowThreshold} from './breach-passage.ts';
import {completeOrder,failCurrentOrder,rotate,aimHeading,applyAimNode}
 from './breach-order-lifecycle.ts';
import type {OrderExecutionPort} from './breach-order-execution-port.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:Pt,b:Pt,range:number)=>d(a,b)<=range;
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
const clone=(p:Pt):Pt=>({...p});
const pop=completeOrder;
/** Preserve the existing sightline for a short ordinary reposition; turning
 * starts only after enough actual forward travel has accumulated. This is
 * deliberately excluded from LOOK/WATCH, threats, strafe, RUN and entry. */
export function holdHeadingForShortMove(
 initialDistance:number,traveled:number,headingDelta:number):boolean{
 return initialDistance<=22&&traveled<18&&Math.abs(headingDelta)>1.04;
}
const naturalTravel=new WeakMap<TeamActor,{
 orderId:number;point:Pt;distance:number;last:number;initialDistance:number
}>();
function rotateNaturalTravel(a:TeamActor,goal:number,dt:number,s:Session,orderId:number,goalPoint:Pt):void{
 let motion=naturalTravel.get(a);
 if(!motion||motion.orderId!==orderId||s.seconds-motion.last>Math.max(.09,dt*3)){
   motion={orderId,point:clone(a.priorP),distance:0,last:s.seconds,
     initialDistance:d(a.priorP,goalPoint)};
   naturalTravel.set(a,motion);
 }
 motion.distance+=d(motion.point,a.p);
 motion.point=clone(a.p);motion.last=s.seconds;
 const difference=Math.abs(((goal-a.heading+Math.PI)%
   (2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI);
 // ~18 world units of real steps before a large turn is allowed.
 if(holdHeadingForShortMove(motion.initialDistance,motion.distance,difference)){
   a.turning=0;return;
 }
 rotate(a,goal,dt,s);
}
/** D3.15A2: after a REAL, reachable hinge is already opening, let the
 * explicit OPEN order handler work at that physical leaf. Otherwise the
 * generic waypoint motor repeatedly walks toward a point now INSIDE the
 * opened panel and never yields execution to the authoritative DOOR node.
 * No remote open: the actor must physically reach the actual moving leaf.
 */
export function mayHandoffOpenedDoorOrder(
 n:Pick<PlanNode,'kind'|'method'|'doorId'>,at:Pt,
 doors:readonly Door[]
):boolean{
 if(n.kind!=='door'||n.method&&n.method!=='open'||!n.doorId)
   return false;
 const door=doors.find(d=>d.id===n.doorId);
 return !!door&&door.open&&(door.openFraction??0)>=.15&&
   doorReachable(at,door);
}

// An occupied final MOVE target is resolved once, not re-optimized on
// every 60Hz tick. A transient settle is execution-only, never an authored
// waypoint or an excuse to shift a teammate who is already stationary.
const settledMoveTargets=new WeakMap<TeamActor,{nodeId:number;point:Pt}>();
/** D3.34: a GENERATED STACK's original world coordinate can become
 * physically occupied by its newly opened real leaf. A completed, validated
 * alternative standing point is the ONLY allowed pose for the immediately
 * linked generated SYNC gate. Nothing rewrites either authored node,
 * globally changes sync tolerances or marks a squad ENTRY as arrived.
 * A player-issued SYNC never obtains this actor-local proof.
 */
type GeneratedStackSyncAnchor={
 syncId:number;syncCode:string;doorId:string;
 original:Pt;point:Pt;
};
const generatedStackSyncAnchors=new WeakMap<TeamActor,GeneratedStackSyncAnchor>();
export function validGeneratedStackSyncAnchor(
 n:PlanNode,a:TeamActor,
 proof:GeneratedStackSyncAnchor|undefined,
 physicallyStandable:(p:Pt)=>boolean
):Pt|null{
 if(n.kind!=='sync'||!n.syncCode||!proof||
    a.plan[0]?.id!==n.id||proof.syncId!==n.id||
    proof.syncCode!==n.syncCode||
    d(n.p,proof.original)>.5||a.side!=='blue'||
    !physicallyStandable(proof.point))return null;
 return proof.point;
}

const entrySettleProbe=new WeakMap<TeamActor,{nodeId:number;nextAt:number}>();
// Optional audit-only provenance. Off in the live game, never participates in
// choosing a destination, modifying an order or moving the physical motor.
export type EntryLandingWitness={
 actorId:string;seconds:number;orderId:number;entryDoorId:string;
 from:Pt;originalGoal:Pt;executedSettle:Pt;
 source:'blocked-physical-entry'|'friendly-arrival'|'order-completed';
};
/** D3.34: only the untouched generated STACK -> SYNC -> ENTRY family.
 * A chosen stack target can be legal against the CLOSED door at planning
 * but become physically occupied by the opened solid leaf later. Never
 * apply an execution-only alternate to an ordinary player MOVE, manual
 * STACK without linked ENTRY, or a door that is still moving/held/locked.
 */
export function eligibleGeneratedStackSettle(
 a:TeamActor,n:PlanNode,door:Door|undefined
):boolean{
 if(n.kind!=='move'||!n.stackDoorId||n.aimLabel!=='pie'||
    n.moveMode!=='strafe'||a.side!=='blue'||a.health<=0||
    a.plan[0]?.id!==n.id||a.plan[1]?.kind!=='sync'||
    !a.plan.some(node=>node.kind==='move'&&
      node.entryDoorId===n.stackDoorId)||
    a.blockedTime<.85||d(a.p,n.p)>34||
    a.squeeze||a.traversal||a.traversalPending||
    a.autoSidestep||a.doorTraversal?.maneuver==='outside-leaf'||
    !door||door.id!==n.stackDoorId||
    !door.open||door.locked||door.jammed||door.wedged||
    door.heldBy||(door.openFraction??0)<.98||
    Math.abs(door.angularVelocity??0)>.08)return false;
 const leaf=doorLeafSegment(door);
 return pointToSegment(n.p,leaf)<OPERATOR_RADIUS+16&&
   pointToSegment(a.p,leaf)<OPERATOR_RADIUS+26;
}

let entryLandingWitness:((event:EntryLandingWitness)=>void)|null=null;
export function setEntryLandingWitness(
 observer:((event:EntryLandingWitness)=>void)|null
):void{entryLandingWitness=observer;}
export function createMovementOrderHandler(port:OrderExecutionPort){
 const {approach}=port;
 return function executeMovementOrder(s:Session,a:TeamActor,n:PlanNode,dt:number,
  visibleThreat:TeamActor|undefined,
  profile?:((section:string,elapsedMs:number)=>void)):boolean{
  // D3.34: an irrecoverable, genuinely FAILED generated STACK
  // member must not walk the same locked route forever OR falsely count
  // ready at an unreachable SYNC. Leave the order intact and expose the
  // physical obstruction to the operator HUD. Other squadmates can GO
  // only when they individually reach their real safe stack positions.
  if(n.kind==='sync'&&failedGeneratedStackSyncMember(
       a,n.syncCode??'A')){
    a.velocity=0;
    if(a.orderIssue?.nodeId!==n.id)
      a.orderIssue={nodeId:n.id,
        reason:'ENTRY SEPARATED · LOCKED STACK ROUTE',
        since:s.seconds};
    return true;
  }
  // Only opt-in perf probes allocate the wrapper. Normal fixed-step movement
  // continues using the original motor callback without extra timing work.
  clearCompletedEntryOnNewOrder(a,n.id);
  const move=profile?
   ((actor:TeamActor,point:Pt,step:number,session:Session,
     scale?:number)=>{
     const start=performance.now();
     const result=approach(actor,point,step,session,scale,profile);
     profile('motor',performance.now()-start);
     return result;
   }):approach;
  if(n.kind==='pie'){
    // Running abandons the cautious corner sweep for ordinary fast travel.
    // The same run override also releases a previously persistent PIE look.
    if(a.pace==='run'){
      a.aimInstruction=null;
      if(near(a.p,n.p,5)){pop(a);return true;}
      move(a,n.p,dt,s,1.40);
      if(a.nav.length)rotate(a,angle(a.p,a.nav[0]),dt,s);
      return true;
    }
    const arc=n.arc??[];
    const point=arc[a.pieIndex];
    if(!point){pop(a);return true;}
    if(near(a.p,point,3.7)){
      a.pieIndex++;a.nav=[];a.velocity=Math.min(a.velocity,32);
      if(a.pieIndex>=arc.length){pop(a);return true;}
    }else{
      // Pieing advances along the physical arc, gun always oriented
      // toward the doorway pivot rather than tangential travel.
      move(a,point,dt,s,.44);
    }
    if(n.pivot&&!a.squeeze)rotate(a,angle(a.p,n.pivot),dt,s);
    return true;
  }
  // Friendly settling is only consulted within 15.5 units of the
  // authored goal (or <=18.5 around a saved settle point). Don't build
  // a roster on every ordinary MOVE tick across the map. A teammate
  // >40 units from the goal cannot affect either settle or arrival gap.
  const friendlyPeers:Pt[]=[];
  const peerRange=n.kind==='move'&&n.entryDoorId?34:20;
  if(n.kind==='move'&&
     (a.p.x-n.p.x)**2+(a.p.y-n.p.y)**2<=peerRange*peerRange)
   for(const peer of s.operators){
    if(peer===a||peer.health<=0||peer.side!==a.side)continue;
    if((peer.p.x-n.p.x)**2+(peer.p.y-n.p.y)**2<=
       (n.entryDoorId?66:40)**2)
     friendlyPeers.push(peer.p);
   }
  // Avoid finishing two authored MOVE destinations inside one friendly
  // body diameter. Make the *last moving operator* take a small, legal
  // settle step; never push or move someone whose own order is complete.
  const remembered=settledMoveTargets.get(a);
  if(remembered&&remembered.nodeId!==n.id)settledMoveTargets.delete(a);
  const retained=n.kind==='move'&&remembered?.nodeId===n.id?
    remembered.point:null;
  // C2c: a previously selected near-goal settling footstep is not proof
  // that the actor can execute it. When the ORIGINAL generated target is
  // inside immutable static wall clearance, do not let retained footwork
  // bypass the same bounded failure policy forever. Give it six seconds
  // of genuine attempted motion first; then report the blocked template.
  // Player-authored MOVE and open/closing door-only obstructions are exempt.
  if(n.kind==='move'&&n.entryDoorId&&a.blockedTime>=6&&
     !retained&&d(a.p,n.p)<=18.5&&
     !sessionWorldGeometry(s).passable(n.p,OPERATOR_RADIUS)){
    settledMoveTargets.delete(a);
    failCurrentOrder(s,a,n,
      'ENTRY LANDING BLOCKED · NO SAFE INTERIOR FOOTPRINT',port.notify);
    return true;
  }
  const settledAt=!!retained&&near(a.p,retained,3.5)&&
    friendlyPeers.every(peer=>d(a.p,peer)>=14);
  const generatedSyncPoint=n.kind==='sync'?
    validGeneratedStackSyncAnchor(n,a,generatedStackSyncAnchors.get(a),
      point=>bodyClear(point,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s))):
    null;
  const arrivedAtLinkedGeneratedSync=!!generatedSyncPoint&&
    near(a.p,generatedSyncPoint,3.5)&&
    bodyClear(a.p,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s));
  // C2: only the generated ENTRY endpoint may move to a physically
  // verified nearby interior position. No authored MOVE target is changed.
  const probe=entrySettleProbe.get(a);
  const nearBlockedEntry=n.kind==='move'&&!retained&&!!n.entryDoorId&&
    a.blockedTime>=.85&&d(a.p,n.p)<=34&&
    (!probe||probe.nodeId!==n.id||s.seconds>=probe.nextAt);
  let entrySettle:Pt|null=null,entrySettleRoute:Pt[]|null=null;
  // D3.34: the only generated-stack endpoint correction reuses the
  // existing physical ENTRY settle selector and transient motor route.
  // It cannot modify the authored STACK, SYNC, or ENTRY plan nodes.
  const stackDoor=n.kind==='move'&&n.stackDoorId?
    s.doors.find(door=>door.id===n.stackDoorId):undefined;
  const nearBlockedStack=n.kind==='move'&&!retained&&
    eligibleGeneratedStackSettle(a,n,stackDoor)&&
    (!probe||probe.nodeId!==n.id||s.seconds>=probe.nextAt);
  let stackSettle:Pt|null=null,stackSettleRoute:Pt[]|null=null;
  if(nearBlockedStack&&stackDoor){
   entrySettleProbe.set(a,{nodeId:n.id,nextAt:s.seconds+1.5});
   const world=sessionWorldGeometry(s);
   // The ORIGINAL stack stance must be physically occupied by THIS
   // stable real open leaf, not merely disfavored by planning heuristics.
   if(bodyClear(a.p,s.doors,OPERATOR_RADIUS,world)&&
      !bodyClear(n.p,s.doors,OPERATOR_RADIUS,world))
    stackSettle=selectPhysicalEntrySettle(a.p,n.p,stackDoor,friendlyPeers,
     point=>d(point,doorCenter(stackDoor))<=68&&
      world.passable(point,OPERATOR_RADIUS)&&
      bodyClear(point,s.doors,OPERATOR_RADIUS,world),
     (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world),
     (from,to)=>routeWithNormalWorld(from,to,s.doors,world),
     path=>{stackSettleRoute=path;});
  }
  if(nearBlockedEntry){
   entrySettleProbe.set(a,{nodeId:n.id,nextAt:s.seconds+1.5});
   const door=s.doors.find(leaf=>leaf.id===n.entryDoorId);
   const world=sessionWorldGeometry(s);
   if(door&&!bodyClear(n.p,s.doors,OPERATOR_RADIUS,world))
    entrySettle=selectPhysicalEntrySettle(a.p,n.p,door,friendlyPeers,
     point=>world.passable(point,OPERATOR_RADIUS)&&
      bodyClear(point,s.doors,OPERATOR_RADIUS,world),
     (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world),
     (from,to)=>routeWithNormalWorld(from,to,s.doors,world),
     path=>{entrySettleRoute=path;});
   // Only a GENERATED landing inside a fixed physical wall is irrecoverable.
   // Opening a leaf cannot fix it; do not quietly count this as arrival
   // or repeatedly collide for 30 seconds. Other MOVE orders stay authored.
   if(!entrySettle&&door&&!world.passable(n.p,OPERATOR_RADIUS)&&
      a.blockedTime>=3.5){
    failCurrentOrder(s,a,n,'ENTRY LANDING BLOCKED · NO SAFE INTERIOR FOOTPRINT',
      port.notify);
    return true;
   }
  }
  // A physically blocked *authored* GO must not be considered reached
  // merely because the operator is within a five-unit completion bubble
  // or has stepped onto a friendly-traffic settle point nearby.
  // This is a live physical test, not a player intel disclosure. Generated
  // ENTRY/STACK have separate, explicitly verified settle contracts.
  const authoredGoalUnstandable=n.kind==='move'&&
    !n.entryDoorId&&!n.stackDoorId&&d(a.p,n.p)<=18.5&&
    !sessionWorldGeometry(s).passable(n.p,OPERATOR_RADIUS);
  const newlySettled=n.kind==='move'&&!retained&&!authoredGoalUnstandable?
    entrySettle??stackSettle??friendlyArrivalSettleTarget(a.p,n.p,friendlyPeers,(from,to)=>
      sessionWorldGeometry(s).passable(to,OPERATOR_RADIUS)&&
      sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s))):null;
  if(newlySettled){
    settledMoveTargets.set(a,{nodeId:n.id,
      point:{...newlySettled}});
    if(stackSettle&&n.kind==='move'&&n.stackDoorId){
      const following=a.plan[1];
      if(following?.kind==='sync'&&following.syncCode&&
         d(following.p,n.p)<.5)
        generatedStackSyncAnchors.set(a,{
          syncId:following.id,syncCode:following.syncCode,
          doorId:n.stackDoorId,original:{...n.p},
          point:{...stackSettle}
        });
    }
    if(entryLandingWitness&&n.kind==='move'&&n.entryDoorId)
      entryLandingWitness({actorId:a.id,seconds:s.seconds,orderId:n.id,
        entryDoorId:n.entryDoorId,from:{...a.p},originalGoal:{...n.p},
        executedSettle:{...newlySettled},
        source:entrySettle?'blocked-physical-entry':'friendly-arrival'});
  }
  if(entrySettle||stackSettle){
    // Both generated ENTRY and generated STACK settle use the existing
    // physical selector and SAME ordinary motor handoff. A stuck STACK
    // never receives completion until its selected alternative is
    // physically reached; it retains the entire authored SYNC/ENTRY tail.
    const chosen=entrySettle??stackSettle!;
    setTransientRoute(s,a,entrySettleRoute??stackSettleRoute??[{...chosen}],
      'generated-entry-settle');
    provisionalRouteAccepted(a);
  }
  const settle=authoredGoalUnstandable?null:retained??newlySettled;
  if(settle&&!settledAt){
    move(a,settle,dt,s,.72);
    return true;
  }
  const at=!authoredGoalUnstandable&&
    (settledAt||arrivedAtLinkedGeneratedSync||near(a.p,n.p,5)||(
      n.kind==='move'&&nearOccupiedFriendlyGoal(a.p,n.p,
        friendlyPeers,(from,to)=>sweptBodyClear(from,to,s.doors,
          OPERATOR_RADIUS,sessionWorldGeometry(s)))));
  if(at&&retained)settledMoveTargets.delete(a);
  // EQA3.2: an active DOOR order's short, physically swept swing-clear
  // stance takes temporary precedence over its original handle waypoint.
  // This movement handler runs BEFORE the door handler. Without the yield,
  // both handlers alternately route back/forth; Retail14 FRONT/SERVICE
  // never finish the retreat and their OPEN actionTimer stays at zero.
  // Do not change authored plans, WAIT/LOOK, collision, or other doors.
  if(n.kind==='door'&&n.doorId&&
     (n.method==='open'||!n.method)&&
     openingFootwork(a,n.doorId,n.id,'stance').target)
    return false;
  if(!at&&(n.kind==='move'||n.kind==='door'||n.kind==='sync')&&
     !mayHandoffOpenedDoorOrder(n,a.p,s.doors)){
    // Running cancels WATCH rather than merely suspending it.
    if(interruptsWatch(n,a.pace))a.aimInstruction=null;
    // A persistent tracking/PIE stance stays cautious on every segment,
    // not only on explicitly marked strafe nodes.
    const running=n.moveMode==='sprint'||a.pace==='run';
    const tracking=!running&&(a.aimInstruction?.mode==='track'||
      n.aimMode==='track');
    const cautious=!running&&(n.moveMode==='strafe'||tracking);
    // Running temporarily suspends tracking but never deletes WATCH.
    // Q6: generated STACK positions are often far from the operator.
    // Use ordinary walk while traversing the clear long approach; resume
    // cautious tracking footwork inside the final 36 world-unit envelope.
    // Explicit player WATCH/strafe remains at the authored cautious pace.
    const distantTemplateStack=n.kind==='move'&&!!n.stackDoorId&&
      n.aimLabel==='pie'&&d(a.p,n.p)>36&&
      (!a.aimInstruction||a.aimInstruction.source==='stack');
    // The untouched four-person entry template transitions into a flowing
    // controlled walk after the squad's GO, rather than applying a perpetual
    // 30% slow-down from the earlier stack WATCH. An explicit player-authored
    // WATCH still has its own cautious speed and facing priority.
    const templateEntry=n.kind==='move'&&!!n.entryDoorId&&
      n.aimMode==='fixed'&&
      (!a.aimInstruction||a.aimInstruction.source==='stack');
    // EQA3.1: a healthy real civilian walks at 43u/s, and a wounded
    // escort at 22u/s; ordinary 53u/s operator travel otherwise outruns
    // the FOLLOW contract and repeatedly triggers ESCORT SEPARATED.
    // This affects only the actual owner of an active FOLLOW, and only
    // ordinary walk; explicit RUN/sprint, door entries, and carriers
    // retain their existing independent physical authority.
    const escorted=!running&&n.kind==='move'&&
      !n.entryDoorId&&!n.stackDoorId&&s.mission==='extract'&&
      s.rescue?.following===a.id?
      s.civilians.find(c=>c.rescueTarget&&c.following===a.id&&
        c.health>0&&!c.carriedById)??null:null;
    // Restrained suspects remain red TeamActors; only the owner of an
    // authored ESCORT walks gently enough to keep a real person behind.
    // Existing RUN and squad-entry ownership retain their original speeds.
    const escortedSuspect=!running&&n.kind==='move'&&
      !n.entryDoorId&&!n.stackDoorId?
      s.operators.find(e=>e.side==='red'&&e.health>0&&
        e.surrendered&&e.escortLeaderId===a.id)??null:null;
    const escortScale=escortWalkMultiplier(a,escorted);
    const prisonerScale=physicalEscortWalkMultiplier(a,escortedSuspect);
    move(a,generatedSyncPoint??n.p,dt,s,(running?1.40:distantTemplateStack?1:
      templateEntry?.90:cautious?.70:1)*Math.min(escortScale,prisonerScale));
    // Unmodified movement follows its route, while an explicit fixed STRAFE
    // or PIE/TRACK instruction persists until LOOK releases it.
    // While wedged sideways, the physical shoulder axis has priority
    // over target tracking. The authored look resumes on exit.
    if(a.squeeze)return true;
    const clearedEntryLook=!running&&n.kind==='move'&&
      !!n.entryDoorId&&n.aimMode==='fixed'&&n.facing!==undefined&&
      entryClearanceForLook(s.doors.find(door=>door.id===n.entryDoorId),
        a.p,n.p);
    // A generated STACK pivot watches its door until the operator is
    // physically through. Only then does that template gaze yield to
    // the already-authored entry sector. Explicit WATCH has no 'stack'
    // provenance and retains priority; visible threats still win.
    const handoff=clearedEntryLook&&
      (a.aimInstruction===null||a.aimInstruction?.source==='stack');
    const held=!running&&visibleThreat?angle(a.p,visibleThreat.p):
      handoff?n.facing!:
      running&&a.aimInstruction?.mode==='track'?null:aimHeading(a);
    if(held!==null){
      a.autoSidestep=null;
      rotate(a,held,dt,s);
    }else if(n.kind==='move'&&n.moveMode==='strafe'){
      a.autoSidestep=null;
      rotate(a,n.facing??a.heading,dt,s);
    }else if(a.nav.length){
      // Clearance glides may move laterally even while the original
      // nav point remains straight ahead. Test the actual resolved motor
      // displacement before declaring the sidestep finished.
      const moved=d(a.p,a.priorP)>.15&&a.velocity>1.5;
      const motorNext=moved?{
        x:a.p.x+(a.p.x-a.priorP.x),
        y:a.p.y+(a.p.y-a.priorP.y)
      }:a.nav[0];
      const facing=autoSidestepFacing(a.autoSidestep,a.p,motorNext,
        n.p,s.seconds,
        a.pace!=='run'&&!a.squeeze&&!visibleThreat&&!a.traversal&&
        !a.aimInstruction&&
        !approachingNarrowThreshold(a.p,n.p,s.doors));
      if(facing===null)a.autoSidestep=null;
      const desired=facing??angle(a.p,a.nav[0]);
      if(a.side==='blue'&&n.kind==='move'&&!n.entryDoorId&&
         !n.stackDoorId&&!running&&!visibleThreat&&!a.aimInstruction&&
         n.moveMode!=='strafe'&&n.facing===undefined&&
         n.aimMode!=='track'&&n.aimMode!=='fixed')
        rotateNaturalTravel(a,desired,dt,s,n.id,n.p);
      else rotate(a,desired,dt,s);
    }
    return true;
  }
  a.velocity=Math.max(0,a.velocity-dt*180);
  if(at){
    if(n.postureState){
      a.posture=n.postureState;a.postureWasAuthored=true;
      a.autoCrouchOriginal=null;a.autoCrouchUntil=0;
    }
    if(n.paceState)a.pace=n.paceState;
    if(interruptsWatch(n,a.pace))a.aimInstruction=null;
    if(n.firePolicyState){
      a.firePolicy=n.firePolicyState;
      a.suppressPoint=n.firePoint?clone(n.firePoint):null;
      a.focusTargetId=n.fireTargetId??null;
    }
  }
  // Apply an authored look/pie/strafe instruction once we actually arrive
  // at its waypoint, then keep it active through every later movement.
  if(n.kind==='move'||n.kind==='look'){
    if(!interruptsWatch(n,a.pace))applyAimNode(a,n);
    if(n.aimMode==='free'&&n.facing!==undefined){
      // LOOK deliberately orients at this node, then releases any tracking
      // or fixed strafe constraint. The next move faces the travel direction.
      if(!rotate(a,n.facing,dt,s))return true;
      // Briefly settle the sightline, allowing normal time-based acquisition.
      if(!visibleThreat&&a.waitRemaining<.22){
        a.waitRemaining+=dt;return true;
      }
    }else{
      const held=visibleThreat?angle(a.p,visibleThreat.p):aimHeading(a);
      if(held!==null)rotate(a,held,dt,s);
    }
    // A completed generated ENTRY order may be treated as logically done
    // without reaching its original physical goal. Report the real body
    // center and the current node target at the instant of retirement.
    // Actual reached GO is the only event that can anchor an entry sector.
    if(n.kind==='move'&&n.entryDoorId)
      recordCompletedGeneratedEntry(a,{
       id:n.id,entryDoorId:n.entryDoorId,p:n.p});
    // This witness does not change the reason, tolerance or order itself.
    if(entryLandingWitness&&n.kind==='move'&&n.entryDoorId)
      entryLandingWitness({actorId:a.id,seconds:s.seconds,orderId:n.id,
        entryDoorId:n.entryDoorId,from:{...a.p},originalGoal:{...n.p},
        executedSettle:{...a.p},source:'order-completed'});
    pop(a);return true;
  }
  if(n.facing!==undefined&&!rotate(a,n.facing,dt,s))return true;
  // Door/wait/sync orders should not cancel a persistent look/track intent.
  const held=aimHeading(a);
  if(held!==null)rotate(a,held,dt,s);

 return false;
 };
}
