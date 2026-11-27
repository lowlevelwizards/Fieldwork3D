/** CT12: projected transport intent, distinct from actual custody. */
import type {PlanNode} from './breach-plan.ts';
export function projectedTransportPatient(current:string|null,plan:readonly PlanNode[]){
 let patient=current;
 for(const n of plan){
  if(n.kind==='evacuate'&&n.transportPickup&&n.patientId&&!patient)patient=n.patientId;
  if(n.kind==='interact'&&(n.interaction==='release-civilian'||n.interaction==='release-capture-target')&&n.objectId===patient)patient=null;
 }
 return patient;
}
export function transportContextAllowed(action:string){
 return ['ctxReleaseCivilian','ctxReleaseCapture','ctxWait','ctxLook','ctxWatch','ctxDelete','ctxDoor'].includes(action);
}
