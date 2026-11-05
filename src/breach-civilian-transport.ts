/** E5-D R2-A1: neutral casualty custody and bounded coupled movement.
 * Uses the existing operator casualty transport geometry, never a second motor.
 * The fixed-tick simulation owns committing BOTH actor positions together. */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
import {casualtyTrailingPosition,transportIsClear,type TransportMode}
 from './breach-casualty-transport.ts';

export type CivilianCarrier={id:string;health:number;carryingId:string|null};
export function civilianTransportEligible(c:CivilianActor,
 carrier:CivilianCarrier):boolean{
 return carrier.health>0&&c.health<=0&&
   (!c.carriedById||c.carriedById===carrier.id)&&
   (!carrier.carryingId||carrier.carryingId===c.id);
}
/** Acquire exclusive ownership only after a real, timed, reachable pickup. */
export function takeCivilianCustody(c:CivilianActor,
 carrier:CivilianCarrier,mode:TransportMode='drag'):boolean{
 if(!civilianTransportEligible(c,carrier))return false;
 c.carriedById=carrier.id;c.transportMode=mode;
 carrier.carryingId=c.id;
 c.following=null;c.goal=null;c.nav=[];c.velocity=0;
 return true;
}
export function dropCivilianCustody(c:CivilianActor,
 carrier:CivilianCarrier):boolean{
 if(c.carriedById!==carrier.id||carrier.carryingId!==c.id)return false;
 c.carriedById=null;c.transportMode=null;carrier.carryingId=null;
 return true;
}
/** Bound each body displacement to the carrier's own fixed-tick step.
 * Even the first frame after pickup cannot snap the body to a trailing slot.
 * Callers still need shared collision reconciliation before committing.
 */
export function proposedCivilianTransportStep(
 bodyFrom:Pt,carrierFrom:Pt,carrierTo:Pt,heading:number,mode:TransportMode,
 clear:(a:Pt,b:Pt)=>boolean,others:readonly Pt[]
):Pt|null{
 const dx=carrierTo.x-carrierFrom.x,dy=carrierTo.y-carrierFrom.y;
 const travel=Math.hypot(dx,dy);
 if(travel<.00001)return {...bodyFrom};
 const desired=casualtyTrailingPosition(carrierFrom,carrierTo,heading,mode);
 const toward={x:desired.x-bodyFrom.x,y:desired.y-bodyFrom.y};
 const length=Math.hypot(toward.x,toward.y);
 const limit=travel+Math.min(travel,1);
 const ratio=length>.00001?Math.min(1,limit/length):0;
 const next={x:bodyFrom.x+toward.x*ratio,
   y:bodyFrom.y+toward.y*ratio};
 return transportIsClear(bodyFrom,next,clear,others)?next:null;
}
