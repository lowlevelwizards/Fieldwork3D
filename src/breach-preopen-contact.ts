/** A3.10 — deterministic, physical pre-OPEN support-hand readiness.
 * The already-authored door node is the only authority. This read-only
 * candidate changes neither hinge, movement, orders, nor fire permission.
 */
import {doorLeafSegment,doorCenter,type Door,type Pt}
 from './breach-core.ts';
import {doorReachable,handlePoint} from './breach-door.ts';
import {contactWithinReach,sameContact,
 type PhysicalContact,type ContactPoint3}
 from './breach-physical-contact-anchor.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';

const REACH=19.6,RETAIN=22.5;
const length=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,v));
const close=(a:Pt,b:Pt)=>length(a,b)<=1e-7;
/** Active intent + body eligibility, not the inferred camera/rig position. */
export function preOpenDoorEligible(a:TeamActor,d:Door):boolean{
 const order=a.plan[0];
 return a.side==='blue'&&order?.kind==='door'&&order.doorId===d.id&&
  (order.method==='open'||order.method===undefined)&&
  a.health>0&&!a.surrendered&&!a.traversal&&!a.traversalPending&&
  !a.squeeze&&a.pace!=='run'&&a.velocity<=7&&a.reload<=0&&
  !a.treatmentActive&&!a.carryingId&&!a.carriedById&&
  !a.doorHandContact?.releasedAt&&a.targetId===null&&a.aim<.24&&
  !d.open&&!d.wedged&&!d.jammed&&!d.heldBy&&
  d.kind!=='shutter'&&d.kind!=='sliding'&&doorReachable(a.p,d);
}
/** Prefer the key/handle; when the hand cannot reach it, touch the nearest
 * ACTUAL same-side leaf/frame instead. No phantom extended arms.
 */
export function preOpenDoorCandidate(
 s:Session,a:TeamActor,d:Door,world:SessionWorldGeometry,
 prior:PhysicalContact|null=null
):PhysicalContact|null{
 if(!preOpenDoorEligible(a,d))return null;
 const f={x:Math.cos(a.heading),y:Math.sin(a.heading)};
 const l={x:-f.y,y:f.x};
 const from:ContactPoint3={
  x:a.p.x+f.x*4+l.x*4,
  y:(a.posture==='crouch'?13:20)-(a.coverStanceDrop??0),
  z:a.p.y+f.y*4+l.y*4
 };
 const leaf=doorLeafSegment(d);
 const dx=leaf.b.x-leaf.a.x,dz=leaf.b.y-leaf.a.y;
 const size=dx*dx+dz*dz;
 if(size<1e-6)return null;
 const projection=clamp(((from.x-leaf.a.x)*dx+
  (from.z-leaf.a.y)*dz)/size,.08,.92);
 const closest={x:leaf.a.x+dx*projection,
  y:leaf.a.y+dz*projection};
 const handle=handlePoint(d);
 const middle=doorCenter(d);
 const nearestEnd=length(a.p,d.a)<length(a.p,d.b)?d.a:d.b;
 // Handle first, then leaf, then reachable frame. A frame may replace a
 // leaf that is near the actor's hinge side, but never an imaginary handle.
 const candidates=[handle,closest,nearestEnd,middle];
 for(let i=0;i<candidates.length;i++){
  const target=candidates[i];
  if(i>0&&close(target,candidates[0]))continue;
  let nx=-dz/Math.sqrt(size),nz=dx/Math.sqrt(size);
  if((a.p.x-target.x)*nx+(a.p.y-target.y)*nz<0){
   nx=-nx;nz=-nz;
  }
  const contact:PhysicalContact={
   intent:'door',limb:'support-hand',
   anchor:{target:'door',id:d.id+':pre-open',
    point:{x:target.x,y:19-(a.coverStanceDrop??0),z:target.y},
    normal:{x:nx,y:0,z:nz}},
   startedAt:s.seconds,releasedAt:null
  };
  const retaining=!!prior&&prior.releasedAt===null&&
   sameContact(contact,prior);
  if(!contactWithinReach(contact,{
    from,acquireReach:REACH,retainReach:RETAIN,lineClear:true
   },retaining))continue;
  // Probe ends on the near side, never penetrates the closed door.
  const near={x:target.x+nx*1.25,y:target.y+nz*1.25};
  if(!world.isClear({x:from.x,y:from.z},near,s.doors))continue;
  return contact;
 }
 return null;
}
