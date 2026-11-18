/** D3.30A — capture only the genuine blocked part of an authored plan.
 * An interruption is NOT a successful arrival and NOT a new active order.
 * UI recovery may subsequently offer these frozen instructions for an
 * explicit player-authorized retry after the physical access is resolved.
 */
import {copyNodes,type PlanNode} from './breach-plan.ts';

export type InterruptedDoorPlan={
 sourceOrderId:number;doorId:string|null;
 at:number;reason:'locked'|'jammed'|'coordinated';
 original:PlanNode[];
};
export function snapshotDoorInterruption(
 active:PlanNode,remaining:readonly PlanNode[],failure:string,
 at:number,physicalDoorId?:string,
 previous:InterruptedDoorPlan|null=null
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
   at,reason,original};
}
