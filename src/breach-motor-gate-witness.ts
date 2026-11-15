/** D3.15B3: optional read-only actual motor-side gate witness.
 * No listener in production, no route, door, PlanNode, position or
 * collision authority. Emits only the existing physical decision.
 */
import type {Pt} from './breach-core.ts';
export type MotorGateTrace={
 seconds:number;actorId:string;position:Pt;next:Pt;attempt:Pt;
 orderKind:string|null;blockedSeconds:number;lastBlocker:string|null;
 doorPaused:boolean;doorClosed:boolean;passagePaused:boolean;
 passageStepClear:boolean;nextSwept:boolean;velocity:number;
};
let observer:((e:MotorGateTrace)=>void)|null=null;
export const setMotorGateObserver=(fn:((e:MotorGateTrace)=>void)|null)=>{
 observer=fn;
};
export const hasMotorGateObserver=()=>observer!==null;
export const recordMotorGate=(e:MotorGateTrace)=>{observer?.(e);};
