/** E5-D R2-A1: neutral casualty custody and bounded coupled movement.
 * Uses the existing operator casualty transport geometry, never a second motor.
 * The fixed-tick simulation owns committing BOTH actor positions together. */
import type {Pt} from './breach-core.ts';
import type {CivilianActor} from './breach-civilian-types.ts';
import type {MotionProposal,MotionDecision} from './breach-movement-authority.ts';
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
 clear:(a:Pt,b:Pt)=>boolean,others:readonly Pt[],
 restingStep=0
):Pt|null{
 const dx=carrierTo.x-carrierFrom.x,dy=carrierTo.y-carrierFrom.y;
 const travel=Math.hypot(dx,dy);
 if(travel<.00001&&restingStep<=0)return {...bodyFrom};
 const desired=casualtyTrailingPosition(carrierFrom,carrierTo,heading,mode);
 const toward={x:desired.x-bodyFrom.x,y:desired.y-bodyFrom.y};
 const length=Math.hypot(toward.x,toward.y);
 // The carrier may stop before the body reaches its trailing position.
 // Pull the body a swept, bounded distance while stationary.
 const limit=travel<.00001?Math.max(0,restingStep):
   travel+Math.min(travel,1);
 const ratio=length>.00001?Math.min(1,limit/length):0;
 const next={x:bodyFrom.x+toward.x*ratio,
   y:bodyFrom.y+toward.y*ratio};
 return transportIsClear(bodyFrom,next,clear,others)?next:null;
}

/** Reconcile carried neutral bodies against the resolved fixed-tick
 * movements of unrelated actors. Body and carrier are rolled back as a
 * unit if a stationary hard body prevents the proposed transport step.
 */
export function reconcileCivilianTransportFrame(
 proposals:readonly MotionProposal[],decisions:MotionDecision[],
 links:readonly {carrierId:string;bodyId:string}[]):void{
 if(!links.length)return;
 const original=new Map(proposals.map(p=>[p.id,p]));
 const resolved=new Map(decisions.map(d=>[d.id,d]));
 const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
 const crosses=(af:Pt,at:Pt,bf:Pt,bt:Pt)=>{
  const initial=distance(af,bf),final=distance(at,bt);
  if(final<20&&final<initial-.001)return true;
  const ox=af.x-bf.x,oy=af.y-bf.y;
  const vx=at.x-af.x-(bt.x-bf.x),vy=at.y-af.y-(bt.y-bf.y);
  const denom=vx*vx+vy*vy;
  if(denom<1e-7)return false;
  const t=Math.max(0,Math.min(1,-(ox*vx+oy*vy)/denom));
  const closest=Math.hypot(ox+vx*t,oy+vy*t);
  return closest<19&&closest<initial-.001;
 };
 for(const {carrierId,bodyId} of [...links].sort(
    (a,b)=>a.carrierId.localeCompare(b.carrierId))){
  const carrier=resolved.get(carrierId),body=resolved.get(bodyId);
  const carrierStart=original.get(carrierId),bodyStart=original.get(bodyId);
  if(!carrier||!body||!carrierStart||!bodyStart)continue;
  if(carrier.blocked){
    body.point=bodyStart.from;body.blocked='actor';continue;
  }
  for(const other of proposals){
    if(other.id===carrierId||other.id===bodyId||
       !other.alive||other.carried)continue;
    const movement=resolved.get(other.id);
    if(!movement||!crosses(bodyStart.from,body.point,
      other.from,movement.point))continue;
    const otherMoved=distance(other.from,movement.point)>.0001;
    const safeToYield=otherMoved&&
      !crosses(bodyStart.from,body.point,other.from,other.from)&&
      distance(body.point,other.from)>=20;
    if(safeToYield){
      movement.point=other.from;movement.blocked='actor';continue;
    }
    carrier.point=carrierStart.from;carrier.blocked='actor';
    body.point=bodyStart.from;body.blocked='actor';
    break;
  }
 }
}
