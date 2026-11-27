/** CT2 — fixed-step, seek-safe game animation contact envelope.
 * No independent animation timer and no position/custody mutation. */
import type {Pt} from './breach-core.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
export type TransportContact=Readonly<{order:number;patientId:string;mode:TransportMode;
 kind:'pickup'|'release';elapsed:number;duration:number;point:Pt;heading:number}>;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const ease=(x:number)=>{const t=clamp(x);return t*t*(3-2*t)};
export function transportContactDuration(mode:TransportMode,kind:'pickup'|'release'){
 return kind==='pickup'?(mode==='drag'?.85:1.45):(mode==='drag'?.35:.72);
}
export function makeTransportContact(order:number,patient:{id:string;p:Pt;heading:number},
 mode:TransportMode,kind:'pickup'|'release',elapsed:number):TransportContact{
 return {order,patientId:patient.id,mode,kind,elapsed,duration:transportContactDuration(mode,kind),
  point:{...patient.p},heading:patient.heading};
}
export function sampleTransportContact(c:TransportContact){
 const t=clamp(c.elapsed/Math.max(.01,c.duration));
 // Lower toward the recorded body, dwell briefly, then rise. Release uses
 // the same deterministic envelope, not a second character clock.
 return {progress:t,bend:ease(t/.28)*(1-ease((t-.72)/.28)),
  reach:ease(t/.45)*(1-ease((t-.88)/.12)),
  contact:t>=.45&&t<.88};
}
