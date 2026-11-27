/** CT13: execution-side occupied hands and actual pair extraction rules. */
import type {PlanNode} from './breach-plan.ts';
import type {Door} from './breach-core.ts';
export function isTransportRelease(n:PlanNode|undefined,patientId:string|null){
 return !!n&&!!patientId&&n.kind==='interact'&&n.objectId===patientId&&
  (n.interaction==='release-civilian'||n.interaction==='release-capture-target');
}
export function transportOrderAllowed(n:PlanNode,patientId:string,doors:readonly Door[]){
 if(isTransportRelease(n,patientId))return true;
 if(n.kind==='evacuate')return n.patientId===patientId;
 if(['move','wait','holdClear','look','sync'].includes(n.kind))return true;
 if(n.kind==='door'){
  const door=doors.find(d=>d.id===n.doorId);
  return !!door&&(!n.method||n.method==='open')&&
    (door.operatingMode==='automatic'||door.open&&(door.openFraction??1)>=.98);
 }
 return false;
}
export function pairInExtraction(carrier:{x:number;y:number},patient:{x:number;y:number},
 extract:{x:number;y:number},radius:number){
 return [carrier,patient].every(p=>Math.hypot(p.x-extract.x,p.y-extract.y)<=radius);
}
