/** A3.5: pure, time-seekable world-contact anchors.
 * This module selects/reports contact; it cannot push a door, move a body,
 * steer the gun or give permission to fire. The simulation owns acquisition.
 */
import type {ContactOwners} from './breach-pose-contacts.ts';
import type {DoorGripPose} from './breach-pose-door-hand.ts';
import {doorGripWeight} from './breach-pose-door-hand.ts';

export type ContactPoint3={x:number;y:number;z:number};
export type ContactTarget='door'|'surface'|'teammate';
export type ContactIntent='door'|'brace'|'teammate';
export type ContactLimb='support-hand'|'firing-hand'|'support-forearm'|'shoulder';
export type ContactAnchor={
 readonly target:ContactTarget;
 readonly id:string;
 /** World coordinates: x/z ground plane, y height. */
 readonly point:ContactPoint3;
 /** Unit normal directed toward the actor contacting the surface. */
 readonly normal:ContactPoint3;
};
export type PhysicalContact={
 readonly intent:ContactIntent;
 readonly limb:ContactLimb;
 readonly anchor:ContactAnchor;
 readonly startedAt:number;
 readonly releasedAt:number|null;
};
/** External motor/world evidence, not inferred from presentation anatomy. */
export type ContactReachEvidence={
 readonly from:ContactPoint3;
 readonly acquireReach:number;
 readonly retainReach:number;
 readonly lineClear:boolean;
};
export type ContactClaim={
 readonly contact:PhysicalContact;
 readonly reach:ContactReachEvidence;
};
export type ContactSelection={
 readonly contact:PhysicalContact;
 readonly weight:number;
 readonly retained:boolean;
};
const finite=(v:number)=>Number.isFinite(v);
const vecFinite=(v:ContactPoint3)=>finite(v.x)&&finite(v.y)&&finite(v.z);
const smooth=(x:number)=>{
 const a=Math.max(0,Math.min(1,x));return a*a*(3-2*a);
};
export function validContactAnchor(a:ContactAnchor):boolean{
 if(!a||!a.id||!['door','surface','teammate'].includes(a.target)||
    !vecFinite(a.point)||!vecFinite(a.normal))return false;
 const length=Math.hypot(a.normal.x,a.normal.y,a.normal.z);
 return length>=.95&&length<=1.05;
}
export function validPhysicalContact(c:PhysicalContact,now:number):boolean{
 if(!c||!finite(now)||!finite(c.startedAt)||c.startedAt>now||
    (c.releasedAt!==null&&(!finite(c.releasedAt)||
      c.releasedAt<c.startedAt))||
    !['door','brace','teammate'].includes(c.intent)||
    !['support-hand','firing-hand','support-forearm','shoulder'].includes(c.limb)||
    !validContactAnchor(c.anchor))return false;
 return (c.intent==='door'&&c.anchor.target==='door')||
        (c.intent==='brace'&&c.anchor.target==='surface')||
        (c.intent==='teammate'&&c.anchor.target==='teammate');
}
export function sameContact(a:PhysicalContact,b:PhysicalContact):boolean{
 return a.intent===b.intent&&a.limb===b.limb&&
   a.anchor.target===b.anchor.target&&a.anchor.id===b.anchor.id;
}
/** Full XYZ reach with an explicit world-occlusion gate and hysteresis.
 * Null evidence/uncertain LOS can never acquire a physical attachment.
 */
export function contactWithinReach(c:PhysicalContact,
 e:ContactReachEvidence,retaining=false):boolean{
 if(!e||!e.lineClear||!validContactAnchor(c.anchor)||
    !vecFinite(e.from)||!finite(e.acquireReach)||
    !finite(e.retainReach)||e.acquireReach<=0||
    e.retainReach<e.acquireReach)return false;
 const reach=retaining?e.retainReach:e.acquireReach;
 const p=c.anchor.point,q=e.from;
 return Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)<=reach+1e-6;
}
/** Action authority always wins. A rifle firing hand is never borrowed.
 * Shoulder/forearm contacts cannot bypass an incompatible action either.
 */
export function contactAllowedByOwners(c:PhysicalContact,
 owners:ContactOwners):boolean{
 if(!owners)return false;
 if(c.intent==='door')return owners.action==='door'&&
   c.limb==='support-hand'&&owners.left==='door';
 if(owners.action!=='hold')return false;
 if(c.limb==='support-hand')return owners.left==='weapon'||
   owners.left==='free';
 if(c.limb==='firing-hand')return owners.right==='free';
 return true;
}
const priority=(c:PhysicalContact)=>c.intent==='door'?0:
 c.intent==='brace'?1:2;
const identity=(c:PhysicalContact)=>c.anchor.target+':'+c.anchor.id+
 ':'+c.limb;
/** Fixed ordering; a previously planted contact wins ties. One limb can
 * never acquire two contacts. Calls run only at fixed simulation ticks.
 */
export function selectPhysicalContact(
 claims:readonly ContactClaim[],owners:ContactOwners,now:number,
 previous:PhysicalContact|null=null
):PhysicalContact|null{
 const eligible=claims.filter(({contact,reach})=>
   validPhysicalContact(contact,now)&&contact.releasedAt===null&&
   contactAllowedByOwners(contact,owners)&&
   contactWithinReach(contact,reach,
     !!previous&&previous.releasedAt===null&&sameContact(contact,previous)));
 eligible.sort((a,b)=>{
   const keepA=!!previous&&sameContact(a.contact,previous)?0:1;
   const keepB=!!previous&&sameContact(b.contact,previous)?0:1;
   return keepA-keepB||priority(a.contact)-priority(b.contact)||
     identity(a.contact).localeCompare(identity(b.contact));
 });
 return eligible[0]?.contact??null;
}
/** Return a new record; no in-place mutation of replay snapshots. */
export function releasePhysicalContact(c:PhysicalContact,now:number):
 PhysicalContact{
 if(c.releasedAt!==null||!finite(now)||now<c.startedAt)return c;
 return {...c,releasedAt:now};
}
/** No rig clock/state. Same historical time always yields same result. */
export function physicalContactWeight(c:PhysicalContact|null|undefined,
 now:number):number{
 if(!c||!validPhysicalContact(c,now))return 0;
 if(c.intent==='door')return doorGripWeight({
   point:{x:c.anchor.point.x,y:c.anchor.point.z},
   mode:'panel',startedAt:c.startedAt,releasedAt:c.releasedAt
 },now);
 const reach=c.intent==='brace'?.18:.24;
 const release=c.intent==='brace'?.24:.30;
 const a=smooth((now-c.startedAt)/reach);
 return a*(c.releasedAt===null?1:
   1-smooth((now-c.releasedAt)/release));
}
/** Read-only pose claim: never grants gameplay ownership or fires. */
export function resolvePhysicalContactPose(
 c:PhysicalContact|null|undefined,owners:ContactOwners,now:number
):ContactSelection|null{
 if(!c||!validPhysicalContact(c,now)||
    !contactAllowedByOwners(c,owners))return null;
 const weight=physicalContactWeight(c,now);
 return weight>0?{contact:c,weight,
   retained:c.releasedAt===null||now<c.releasedAt}:null;
}
/** D4 adapter: the moving leaf is the sole door geometry source; its
 * existing fixed-step hand contact remains the actual authority.
 */
export function doorGripPhysicalContact(
 doorId:string,grip:DoorGripPose,
 leaf:{a:{x:number;y:number};b:{x:number;y:number}},
 actor:{x:number;y:number}
):PhysicalContact|null{
 if(!grip||!doorId||!leaf||!actor)return null;
 const dx=leaf.b.x-leaf.a.x,dz=leaf.b.y-leaf.a.y;
 const length=Math.hypot(dx,dz);
 if(length<1e-6||!finite(length))return null;
 let nx=-dz/length,nz=dx/length;
 if((actor.x-grip.point.x)*nx+
    (actor.y-grip.point.y)*nz<0){nx=-nx;nz=-nz;}
 const contact:PhysicalContact={
  intent:'door',limb:'support-hand',
  anchor:{target:'door',id:doorId,
   point:{x:grip.point.x,y:19,z:grip.point.y},
   normal:{x:nx,y:0,z:nz}},
  startedAt:grip.startedAt,releasedAt:grip.releasedAt
 };
 return validContactAnchor(contact.anchor)?contact:null;
}
