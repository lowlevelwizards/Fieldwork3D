import {sessionWorldGeometry} from './breach-world-context.ts';
/** Stage 8: conditional locomotion, lasting WATCH/LOOK aim, PIE
 * progression and waypoint arrival. Motion is still delegated to the
 * authoritative Stage 7 physical motor.
 */
import {OPERATOR_RADIUS,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {targetAngle,interruptsWatch} from './breach-plan.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {friendlyArrivalSettleTarget,nearOccupiedFriendlyGoal}
 from './breach-friendly-traffic.ts';
import {entryClearanceForLook} from './breach-entry-coordination.ts';
import {selectPhysicalEntrySettle} from './breach-entry-target-settle.ts';
import {bodyClear} from './breach-navigation.ts';
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
// An occupied final MOVE target is resolved once, not re-optimized on
// every 60Hz tick. A transient settle is execution-only, never an authored
// waypoint or an excuse to shift a teammate who is already stationary.
const settledMoveTargets=new WeakMap<TeamActor,{nodeId:number;point:Pt}>();
const entrySettleProbe=new WeakMap<TeamActor,{nodeId:number;nextAt:number}>();
export function createMovementOrderHandler(port:OrderExecutionPort){
 const {approach}=port;
 return function executeMovementOrder(s:Session,a:TeamActor,n:PlanNode,dt:number,
  visibleThreat:TeamActor|undefined,
  profile?:((section:string,elapsedMs:number)=>void)):boolean{
  // Only opt-in perf probes allocate the wrapper. Normal fixed-step movement
  // continues using the original motor callback without extra timing work.
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
  if(n.kind==='move'&&
     (a.p.x-n.p.x)**2+(a.p.y-n.p.y)**2<=20*20)
   for(const peer of s.operators){
    if(peer===a||peer.health<=0||peer.side!==a.side)continue;
    if((peer.p.x-n.p.x)**2+(peer.p.y-n.p.y)**2<=40*40)
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
     d(a.p,n.p)<=18.5&&
     !sessionWorldGeometry(s).passable(n.p,OPERATOR_RADIUS)){
    settledMoveTargets.delete(a);
    failCurrentOrder(s,a,n,
      'ENTRY LANDING BLOCKED · NO SAFE INTERIOR FOOTPRINT',port.notify);
    return true;
  }
  const settledAt=!!retained&&near(a.p,retained,3.5)&&
    friendlyPeers.every(peer=>d(a.p,peer)>=14);
  // C2: only the generated ENTRY endpoint may move to a physically
  // verified nearby interior position. No authored MOVE target is changed.
  const probe=entrySettleProbe.get(a);
  const nearBlockedEntry=n.kind==='move'&&!retained&&!!n.entryDoorId&&
    a.blockedTime>=.85&&d(a.p,n.p)<=18.5&&
    (!probe||probe.nodeId!==n.id||s.seconds>=probe.nextAt);
  let entrySettle:Pt|null=null;
  if(nearBlockedEntry){
   entrySettleProbe.set(a,{nodeId:n.id,nextAt:s.seconds+1.5});
   const door=s.doors.find(leaf=>leaf.id===n.entryDoorId);
   const world=sessionWorldGeometry(s);
   if(door&&!bodyClear(n.p,s.doors,OPERATOR_RADIUS,world))
    entrySettle=selectPhysicalEntrySettle(a.p,n.p,door,friendlyPeers,
     point=>world.passable(point,OPERATOR_RADIUS)&&
      bodyClear(point,s.doors,OPERATOR_RADIUS,world),
     (from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,world));
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
  const newlySettled=n.kind==='move'&&!retained?
    entrySettle??friendlyArrivalSettleTarget(a.p,n.p,friendlyPeers,(from,to)=>
      sessionWorldGeometry(s).passable(to,OPERATOR_RADIUS)&&
      sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s))):null;
  if(newlySettled)settledMoveTargets.set(a,{nodeId:n.id,
    point:{...newlySettled}});
  const settle=retained??newlySettled;
  if(settle&&!settledAt){
    move(a,settle,dt,s,.72);
    return true;
  }
  const at=settledAt||near(a.p,n.p,5)||(
    n.kind==='move'&&nearOccupiedFriendlyGoal(a.p,n.p,
      friendlyPeers,(from,to)=>sweptBodyClear(from,to,s.doors,OPERATOR_RADIUS,sessionWorldGeometry(s))));
  if(at&&retained)settledMoveTargets.delete(a);
  if(!at&&(n.kind==='move'||n.kind==='door'||n.kind==='sync')){
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
    move(a,n.p,dt,s,running?1.40:distantTemplateStack?1:
      templateEntry?.90:cautious?.70:1);
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
      rotate(a,facing??angle(a.p,a.nav[0]),dt,s);
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
    pop(a);return true;
  }
  if(n.facing!==undefined&&!rotate(a,n.facing,dt,s))return true;
  // Door/wait/sync orders should not cancel a persistent look/track intent.
  const held=aimHeading(a);
  if(held!==null)rotate(a,held,dt,s);

 return false;
 };
}
