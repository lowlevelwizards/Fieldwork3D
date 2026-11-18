/** D3.30A — capture only the genuine blocked part of an authored plan.
 * An interruption is NOT a successful arrival and NOT a new active order.
 * UI recovery may subsequently offer these frozen instructions for an
 * explicit player-authorized retry after the physical access is resolved.
 */
import {copyNodes,type PlanNode} from './breach-plan.ts';
import type {Door,Pt} from './breach-core.ts';

export type InterruptedDoorPlan={
 sourceOrderId:number;doorId:string|null;
 /** Fixed physical approach side at interruption, never live door disclosure. */
 approachSide?:-1|0|1;
 at:number;reason:'locked'|'jammed'|'coordinated';
 original:PlanNode[];
};
export function snapshotDoorInterruption(
 active:PlanNode,remaining:readonly PlanNode[],failure:string,
 at:number,physicalDoorId?:string,
 previous:InterruptedDoorPlan|null=null,approachSide?:-1|0|1
):InterruptedDoorPlan|null{
 const reason=/DOOR LOCKED/.test(failure)?'locked':
   /DOOR JAMMED/.test(failure)?'jammed':
   /TEAM ENTRY INTERRUPTED/.test(failure)?'coordinated':null;
 if(!reason||!['wait','move','door'].includes(active.kind))return previous;
 if(previous?.original.some(n=>n.id===active.id))
  return previous; // A generated WAIT followed by its MOVE is one incident.
 const dependent=active.kind==='wait'&&active.duration===0&&active.doorId?
   remaining[1]?.kind==='move'&&remaining[1].entryDoorId===active.doorId?
     remaining[1]:undefined:undefined;
 const original=copyNodes(dependent?[active,dependent]:[active]);
 return {sourceOrderId:active.id,
   doorId:physicalDoorId??active.doorId??active.entryDoorId??null,
   at,reason,original,
   ...(approachSide===undefined?{}:{approachSide})};
}

/** Normalized signed approach side relative to the recorded physical leaf.
 * A torso precisely on the plane is unknown (0), not a guessed entry side.
 * This reads geometry only; lock and unseen intel cannot influence it.
 */
export function interruptedDoorApproachSide(
 door:Pick<Door,'a'|'b'>|undefined,p:Pt
):-1|0|1{
 if(!door)return 0;
 const dx=door.b.x-door.a.x,dy=door.b.y-door.a.y;
 const length=Math.hypot(dx,dy);
 if(length<.001)return 0;
 const signed=((p.x-door.a.x)*(-dy)+(p.y-door.a.y)*dx)/length;
 return signed>1?1:signed< -1?-1:0;
}
