/** Stage 8: conditional locomotion, lasting WATCH/LOOK aim, PIE
 * progression and waypoint arrival. Motion is still delegated to the
 * authoritative Stage 7 physical motor.
 */
import {OPERATOR_RADIUS,passable,type Pt} from './breach-core.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {targetAngle,interruptsWatch} from './breach-plan.ts';
import {sweptBodyClear} from './breach-navigation.ts';
import {friendlyArrivalSettleTarget,nearOccupiedFriendlyGoal}
 from './breach-friendly-traffic.ts';
import {entryClearanceForLook} from './breach-entry-coordination.ts';
import {autoSidestepFacing} from './breach-auto-sidestep.ts';
import {approachingNarrowThreshold} from './breach-passage.ts';
import {completeOrder,rotate,aimHeading,applyAimNode}
 from './breach-order-lifecycle.ts';
import type {OrderExecutionPort} from './breach-order-execution-port.ts';
const d=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const near=(a:Pt,b:Pt,range:number)=>d(a,b)<=range;
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
const clone=(p:Pt):Pt=>({...p});
const pop=completeOrder;
export function createMovementOrderHandler(port:OrderExecutionPort){
 const {approach}=port;
 return function executeMovementOrder(s:Session,a:TeamActor,n:PlanNode,dt:number,
  visibleThreat:TeamActor|undefined):boolean{
  if(n.kind==='pie'){
    // Running abandons the cautious corner sweep for ordinary fast travel.
    // The same run override also releases a previously persistent PIE look.
    if(a.pace==='run'){
      a.aimInstruction=null;
      if(near(a.p,n.p,5)){pop(a);return true;}
      approach(a,n.p,dt,s,1.40);
      if(a.nav.length)rotate(a,angle(a.p,a.nav[0]),dt);
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
      approach(a,point,dt,s,.44);
    }
    if(n.pivot&&!a.squeeze)rotate(a,angle(a.p,n.pivot),dt);
    return true;
  }
  const friendlyPeers=n.kind==='move'?
    s.operators.filter(b=>b!==a&&b.health>0&&b.side===a.side)
      .map(b=>b.p):[];
  // Avoid finishing two authored MOVE destinations inside one friendly
  // body diameter. Make the *last moving operator* take a small, legal
  // settle step; never push or move someone whose own order is complete.
  const settle=n.kind==='move'?friendlyArrivalSettleTarget(
    a.p,n.p,friendlyPeers,(from,to)=>
      passable(to,OPERATOR_RADIUS)&&sweptBodyClear(from,to,s.doors)):null;
  if(settle){
    approach(a,settle,dt,s,.72);
    return true;
  }
  const at=near(a.p,n.p,5)||(
    n.kind==='move'&&nearOccupiedFriendlyGoal(a.p,n.p,
      friendlyPeers,(from,to)=>sweptBodyClear(from,to,s.doors)));
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
    approach(a,n.p,dt,s,running?1.40:cautious?.70:1);
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
      rotate(a,held,dt);
    }else if(n.kind==='move'&&n.moveMode==='strafe'){
      a.autoSidestep=null;
      rotate(a,n.facing??a.heading,dt);
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
      rotate(a,facing??angle(a.p,a.nav[0]),dt);
    }
    return true;
  }
  a.velocity=Math.max(0,a.velocity-dt*180);
  if(at){
    if(n.postureState)a.posture=n.postureState;
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
      if(!rotate(a,n.facing,dt))return true;
      // Briefly settle the sightline, allowing normal time-based acquisition.
      if(!visibleThreat&&a.waitRemaining<.22){
        a.waitRemaining+=dt;return true;
      }
    }else{
      const held=visibleThreat?angle(a.p,visibleThreat.p):aimHeading(a);
      if(held!==null)rotate(a,held,dt);
    }
    pop(a);return true;
  }
  if(n.facing!==undefined&&!rotate(a,n.facing,dt))return true;
  // Door/wait/sync orders should not cancel a persistent look/track intent.
  const held=aimHeading(a);
  if(held!==null)rotate(a,held,dt);

 return false;
 };
}
