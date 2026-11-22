/** D3.34 P3: a GENERATED squad entry sync must not trap every healthy
 * teammate when one actor already FAILED the prerequisite generated STACK
 * MOVE against a physically witnessed LOCKED door and remains immobile.
 *
 * No completion, cancellation, teleport, authored-plan change or lock
 * waiver occurs. The failed member remains blocked with its real failure
 * recorded; only the still-capable peers may proceed once THEY are ready.
 * Ordinary user-authored SYNC, a transient delay, or any moving actor
 * cannot claim this exception.
 */
import type {PlanNode} from './breach-plan.ts';
import type {Pt} from './breach-core.ts';

export type GeneratedSyncMember={
 side:string;health:number;p:Pt;plan:readonly PlanNode[];
 syncReady:string|null;blockedTime:number;lastBlocker:string;
 lastFailedOrder?:{id:number;kind:string;reason:string;at:number}|null;
};

export function failedGeneratedStackSyncMember(
 a:GeneratedSyncMember,code:string
):boolean{
 const n=a.plan[0],failure=a.lastFailedOrder;
 if(a.side!=='blue'||a.health<=0||n?.kind!=='sync'||
    n.syncCode!==code||a.syncReady===code||
    !failure||failure.kind!=='move'||
    !/DOOR LOCKED/.test(failure.reason)||
    failure.id>=n.id||n.id-failure.id>8||
    a.blockedTime<3||
    (a.lastBlocker!=='door'&&a.lastBlocker!=='route')||
    Math.hypot(a.p.x-n.p.x,a.p.y-n.p.y)<8)return false;
 // A failed ordinary MOVE followed by a player SYNC is not eligible.
 // The CURRENT plan must contain an unmodified GENERATED entry with
 // its own physical portal and the same group code.
 return a.plan.some(node=>node.kind==='move'&&
   typeof node.entryDoorId==='string'&&node.entryDoorId.length>0);
}
