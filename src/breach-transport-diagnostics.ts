/** CT0 — read-only fixed-step transport observations. No renderer clock or motor authority. */
import type {Pt} from './breach-core.ts';
import type {TransportMode} from './breach-casualty-transport.ts';
type Actor={id:string;p:Pt;health:number;carryingId?:string|null;carriedById?:string|null;transportMode?:TransportMode|null};
export function observeTransport(carrier:Actor,body:Actor,previous?:{carrier:Pt;body:Pt}){
 const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
 const carrierStep=previous?distance(previous.carrier,carrier.p):0;
 const bodyStep=previous?distance(previous.body,body.p):0;
 return {reciprocal:carrier.carryingId===body.id&&body.carriedById===carrier.id,
  eligible:carrier.health>0&&body.health<=0,mode:body.transportMode??'drag',
  separation:distance(carrier.p,body.p),carrierStep,bodyStep,
  stationaryDrift:carrierStep<.00001?bodyStep:0};
}
