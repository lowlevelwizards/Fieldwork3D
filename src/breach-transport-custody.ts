/** CT1: reciprocal custody is shared across operator and neutral casualties.
 * Mission eligibility, knowledge and reach are checked by callers before
 * acquisition. No physical position is written here. */
import type {TransportMode} from './breach-casualty-transport.ts';
export type TransportCarrier={id:string;health:number;carryingId:string|null;
 transportLatched?:boolean;carriedById?:string|null};
export type TransportPatient={id:string;health:number;carriedById:string|null;
 transportMode?:TransportMode|null;carryingId?:string|null};
export function canAcquireTransport(c:TransportCarrier,p:TransportPatient){
 return c.id!==p.id&&c.health>0&&p.health<=0&&!c.carriedById&&!p.carryingId&&
  (!c.carryingId||c.carryingId===p.id)&&(!p.carriedById||p.carriedById===c.id);
}
export function hasTransportLink(c:TransportCarrier,p:TransportPatient){
 return c.carryingId===p.id&&p.carriedById===c.id;
}
export function acquireTransport(c:TransportCarrier,p:TransportPatient,mode:TransportMode){
 if(!canAcquireTransport(c,p))return false;
 c.carryingId=p.id;p.carriedById=c.id;p.transportMode=mode;return true;
}
export function releaseTransport(c:TransportCarrier,p?:TransportPatient|null){
 if(!c.carryingId)return false;
 if(p&&c.carryingId!==p.id)return false;
 if(p?.carriedById===c.id){p.carriedById=null;p.transportMode=null;}
 c.carryingId=null;c.transportLatched=false;return true;
}
