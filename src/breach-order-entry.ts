import {sessionWorldGeometry} from './breach-world-context.ts';
/** Stage 8: authored door-tool use and access/lock/latch timings.
 * This consumes a node only on real successful completion.
 */
import type {Session,TeamActor} from './breach-game.ts';
import type {PlanNode} from './breach-plan.ts';
import {doorCenter,type Pt} from './breach-core.ts';
import {doorReachable,doorApproach} from './breach-door.ts';
import {entryToolVerdict} from './breach-entry-tools.ts';
import {canUseEntryTool,issuedWedges} from './equipment-entry-tools.ts';
import {equipmentRetrievalSeconds} from './equipment-carry-placement.ts';
import {initialEquipmentLoadout} from './equipment-loadouts.ts';
import {targetAngle} from './breach-plan.ts';
import {completeOrder,rotate,clearCurrentOrderIssue,
 failCurrentOrder as failOrder} from './breach-order-lifecycle.ts';
import type {OrderExecutionPort} from './breach-order-execution-port.ts';
const angle=(a:Pt,b:Pt)=>targetAngle(a,b);
const pop=completeOrder;
export function createEntryOrderHandler(port:OrderExecutionPort){
 const {approach,notify,hear,battleEvent}=port;
 const failCurrentOrder=(s:Session,a:TeamActor,n:PlanNode,reason:string)=>
  failOrder(s,a,n,reason,port.notify);
 return function executeEntryOrder(s:Session,a:TeamActor,n:PlanNode,dt:number):boolean{
  if(n.kind==='tool'){
    const door=s.doors.find(door=>door.id===n.doorId);
    const method=n.toolMethod;
    if(!door||!method||!canUseEntryTool(a.equipment,method)||
       (method==='wedge'&&a.wedgeRemaining<1)){
      failCurrentOrder(s,a,n,'ENTRY TOOL UNAVAILABLE');return true;
    }
    if(!doorReachable(a.p,door)){
      const approachPoint=doorApproach(a.p,door,sessionWorldGeometry(s));
      if(approachPoint){clearCurrentOrderIssue(a);approach(a,approachPoint,dt,s,.66);}
      else failCurrentOrder(s,a,n,'ENTRY TOOL CANNOT REACH');
      return true;
    }
    const verdict=entryToolVerdict(door,method);
    if(!verdict.allowed){
      failCurrentOrder(s,a,n,'ENTRY TOOL BLOCKED · '+verdict.reason);return true;
    }
    clearCurrentOrderIssue(a);a.velocity=0;rotate(a,angle(a.p,doorCenter(door)),dt);
    if(a.actionTimer===0){a.lastDoorAt=s.seconds;a.lastDoorId=door.id;
      a.lastDoorMethod='open';}
    // Tool retrieval from a backpack or inaccessible overflow is slower
    // than a belt mount. Wedge removal still uses the required tool.
    const access=method==='pick'?0:equipmentRetrievalSeconds(
      a.equipment??initialEquipmentLoadout(a.weapon),a.spareMagazines,'utility');
    // A hit interrupts fine hand manipulation without consuming a tool.
    if(method==='pick'&&s.seconds-a.lastHitAt<.35){
      a.actionTimer=0;return true;
    }
    a.actionTimer+=dt;
    if(a.actionTimer<verdict.seconds+(Number.isFinite(access)?access:0))return true;
    if(method==='wedge'){
      door.wedged=true;door.wedgeOwnerId=a.id;
      a.wedgeRemaining--;
    }else if(method==='unwedge'){
      door.wedged=false;
      const owner=s.operators.find(o=>o.id===door.wedgeOwnerId);
      if(owner&&canUseEntryTool(owner.equipment,'wedge'))
       owner.wedgeRemaining=Math.min(issuedWedges(owner.equipment),
        owner.wedgeRemaining+1);
      door.wedgeOwnerId=undefined;
    }
    else if(method==='pick'){
      // Picking operates the lock rather than destroying the frame.
      door.locked=false;door.open=true;door.openedAt=s.seconds;
      door.pushTarget=1;
    }else{
      door.latchIntegrity=Math.max(-1,(door.latchIntegrity??1)-verdict.damage);
      if((door.latchIntegrity??0)<=0){
        door.locked=false;door.jammed=false;door.heldBy=null;
        door.forced=true;door.open=true;door.openedAt=s.seconds;
      }
    }
    s.objectRevision++;
    hear(s,doorCenter(door),verdict.noise,method);
    const label=method.toUpperCase()+(method==='pick'?' · UNLOCKED':
      door.open?' · FORCED OPEN':
      method==='wedge'?' · SECURED':method==='unwedge'?' · REMOVED':
      ' · FRAME DAMAGED');
    notify(s,door.id+' '+label);battleEvent(s,'door',a,doorCenter(door),door.id+' '+label);
    pop(a);return true;
  }

 return false;
 };
}
