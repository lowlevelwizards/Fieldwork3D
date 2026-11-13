/** A3.6–A3.7 fixed-tick physical support contacts.
 * World/actor geometry selects contacts. Existing pose IK renders them;
 * this module never modifies locomotion, inventory, weapon, shots or peers.
 */
import {pointToSegment,type Pt,type Segment,type Obstacle} from './breach-core.ts';
import {coverHeight} from './breach-cover-height.ts';
import type {Session,TeamActor} from './breach-game.ts';
import type {SessionWorldGeometry} from './breach-world-context.ts';
import {sessionWorldGeometry} from './breach-world-context.ts';
import {lockpickContactCandidate} from './breach-lockpick-contact.ts';
import {resolvePoseContactOwners,type ContactOwners} from './breach-pose-contacts.ts';
import {contactWithinReach,sameContact,
  releasePhysicalContact,selectPhysicalContact,
  type PhysicalContact,type ContactClaim,type ContactPoint3}
 from './breach-physical-contact-anchor.ts';

export const SUPPORT_ACQUIRE_REACH=19.6;
export const SUPPORT_RELEASE_REACH=22.5;
export const SUPPORT_RELEASE_WINDOW=.31;
const distance=(a:Pt,b:Pt)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const forward=(h:number):Pt=>({x:Math.cos(h),y:Math.sin(h)});
const left=(h:number):Pt=>({x:-Math.sin(h),y:Math.cos(h)});
const unit=(v:Pt):Pt=>{
 const n=Math.hypot(v.x,v.y);return n>1e-6?
  {x:v.x/n,y:v.y/n}:{x:0,y:0};
};
const handOrigin=(a:TeamActor):ContactPoint3=>{
 const f=forward(a.heading),l=left(a.heading);
 return {x:a.p.x+f.x*4+l.x*4,
   y:(a.posture==='crouch'?13:20)-(a.coverStanceDrop??0),
   z:a.p.y+f.y*4+l.y*4};
};
const sourcePoint=(p:ContactPoint3):Pt=>({x:p.x,y:p.z});
const faceVisible=(s:Session,world:SessionWorldGeometry,
 from:ContactPoint3,point:Pt,normal:Pt):boolean=>{
 // Stop at the actor side of the solid surface, never shoot an optical
 // probe through the very wall/cover that is supposed to be touched.
 const end={x:point.x+normal.x*1.25,y:point.y+normal.y*1.25};
 return world.isClear(sourcePoint(from),end,s.doors);
};
export type SupportSurface={
 readonly id:string;readonly point:Pt;readonly normal:Pt;
 readonly height:number;readonly kind:'wall'|'cover'|'doorframe';
};
const nearestPoint=(p:Pt,segment:Segment):Pt=>{
 const dx=segment.b.x-segment.a.x,dy=segment.b.y-segment.a.y;
 const t=clamp(((p.x-segment.a.x)*dx+(p.y-segment.a.y)*dy)/
  Math.max(1e-9,dx*dx+dy*dy),0,1);
 return {x:segment.a.x+dx*t,y:segment.a.y+dy*t};
};
/** The normal always faces the actor; no attachment to the back of a wall. */
export function wallSupportSurface(
 actor:Pt,wall:Segment,id:string,height=19):SupportSurface|null{
 const tangent={x:wall.b.x-wall.a.x,y:wall.b.y-wall.a.y};
 const length=Math.hypot(tangent.x,tangent.y);
 if(length<1e-6)return null;
 const point=nearestPoint(actor,wall);
 let normal={x:-tangent.y/length,y:tangent.x/length};
 if((actor.x-point.x)*normal.x+
    (actor.y-point.y)*normal.y<0)
  normal={x:-normal.x,y:-normal.y};
 return {id,point,normal,height,kind:'wall'};
}
export function coverSupportSurface(
 actor:Pt,cover:Obstacle,id:string):SupportSurface|null{
 if(cover.destroyed||cover.toppled||
    /fence|foliage|bush|tree|cloth/i.test(cover.fixture??''))return null;
 const height=coverHeight(cover);
 if(!Number.isFinite(height)||height<15)return null;
 const hx=Math.abs(cover.w)/2,hy=Math.abs(cover.h)/2;
 if(!(hx>2&&hy>2))return null;
 const dx=actor.x-cover.x,dy=actor.y-cover.y;
 // Reject an actor INSIDE the solid, rather than produce a false contact.
 if(Math.abs(dx)<=hx+.6&&Math.abs(dy)<=hy+.6)return null;
 const gapX=Math.abs(dx)-hx,gapY=Math.abs(dy)-hy;
 if(gapX>0&&(gapX>=gapY||gapY<=0)){
  const sign=Math.sign(dx);
  return {id,point:{x:cover.x+sign*hx,
    y:clamp(actor.y,cover.y-hy,cover.y+hy)},
   normal:{x:sign,y:0},height,
   kind:'cover'};
 }
 const sign=Math.sign(dy);
 return {id,point:{x:clamp(actor.x,cover.x-hx,cover.x+hx),
   y:cover.y+sign*hy},normal:{x:0,y:sign},
   height:Math.min(21,height),kind:'cover'};
}
const actorFacingSurface=(a:TeamActor,point:Pt):boolean=>{
 const f=forward(a.heading),l=left(a.heading);
 const delta={x:point.x-a.p.x,y:point.y-a.p.y};
 const front=delta.x*f.x+delta.y*f.y;
 const supportSide=delta.x*l.x+delta.y*l.y;
 // The left/support arm can brace slightly forward or beside the actor;
 // behind-body, cross-shoulder or remote contacts do not qualify.
 return front>=-8&&front<=22&&supportSide>=-7&&supportSide<=21;
};
function contactForSurface(
 s:Session,a:TeamActor,surface:SupportSurface,
 world:SessionWorldGeometry,retaining:boolean
):ContactClaim|null{
 if(!actorFacingSurface(a,surface.point))return null;
 const origin=handOrigin(a);
 const contact:PhysicalContact={intent:'brace',limb:'support-hand',
  anchor:{target:'surface',id:surface.id,
    point:{x:surface.point.x,y:surface.height,z:surface.point.y},
    normal:{x:surface.normal.x,y:0,z:surface.normal.y}},
  startedAt:s.seconds,releasedAt:null};
 const evidence={from:origin,acquireReach:SUPPORT_ACQUIRE_REACH,
  retainReach:SUPPORT_RELEASE_REACH,
  lineClear:faceVisible(s,world,origin,surface.point,surface.normal)};
 return contactWithinReach(contact,evidence,retaining)?
  {contact,reach:evidence}:null;
}
export function chooseEnvironmentSupport(
 s:Session,a:TeamActor,world:SessionWorldGeometry,
 previous:PhysicalContact|null
):ContactClaim|null{
 const origin=handOrigin(a),p=sourcePoint(origin);
 const options:{claim:ContactClaim;score:number}[]=[];
 function push(surface:SupportSurface|null){
  if(!surface)return;
  const retained=!!previous&&previous.releasedAt===null&&
    previous.anchor.id===surface.id;
  const claim=contactForSurface(s,a,surface,world,retained);
  if(!claim)return;
  options.push({claim,score:Math.hypot(
    surface.point.x-origin.x,surface.height-origin.y,
    surface.point.y-origin.z)});
 }
 world.someWallNearPoint(a.p,30,(wall,index)=>{
  if(pointToSegment(a.p,wall)>29)return false;
  push(wallSupportSurface(p,wall,'wall:'+index));return false;
 });
 world.someCoverNearPoint(a.p,38,(cover,index)=>{
  push(coverSupportSurface(p,cover,'cover:'+index));return false;
 });
 // Doorframes are the immutable door endpoints, not a moving leaf:
 // the D4 hinge contact remains separate and higher priority.
 for(const door of s.doors){
  if(door.kind==='sliding'||door.kind==='shutter')continue;
  for(const [suffix,point] of [['a',door.a],['b',door.b]] as const){
   if(distance(a.p,point)>29)continue;
   const normal=unit({x:a.p.x-point.x,y:a.p.y-point.y});
   if(!normal.x&&!normal.y)continue;
   push({id:'frame:'+door.id+':'+suffix,point,normal,
    height:19,kind:'doorframe'});
  }
 }
 options.sort((a,b)=>a.score-b.score||
  a.claim.contact.anchor.id.localeCompare(b.claim.contact.anchor.id));
 const retained=previous&&previous.releasedAt===null?
  options.find(x=>sameContact(x.claim.contact,previous)):null;
 // A planted support hand is stable until reach/occlusion truly breaks.
 return (retained??options[0])?.claim??null;
}
export function teammateShoulderPoint(
 leader:Pick<TeamActor,'p'|'heading'|'posture'>
):ContactPoint3{
 const f=forward(leader.heading),l=left(leader.heading);
 return {x:leader.p.x-f.x*5+l.x*5.5,
   y:leader.posture==='crouch'?13:21,
   z:leader.p.y-f.y*5+l.y*5.5};
}
/** A physical rear-shoulder attachment, never a permission to shoot through
 * either actor. The lead unit is NEVER modified by this claim.
 */
export function chooseTeammateSupport(
 s:Session,a:TeamActor,world:SessionWorldGeometry,
 previous:PhysicalContact|null
):ContactClaim|null{
 if(a.side!=='blue')return null;
 const f=forward(a.heading),l=left(a.heading);
 const from=handOrigin(a);
 const options:{claim:ContactClaim;score:number}[]=[];
 for(const lead of s.operators){
  if(lead===a||lead.side!==a.side||lead.health<=0||
     lead.surrendered||lead.traversal||lead.squeeze||
     lead.posture!==a.posture||lead.velocity>7||
     lead.pace==='run'||lead.reload>0||
     lead.targetId!==null||lead.treatmentActive)continue;
  if(Math.cos(lead.heading-a.heading)<.91)continue;
  const dx=lead.p.x-a.p.x,dy=lead.p.y-a.p.y;
  const ahead=dx*f.x+dy*f.y,across=dx*l.x+dy*l.y;
  if(ahead<14||ahead>34||Math.abs(across)>11)continue;
  const shoulder=teammateShoulderPoint(lead);
  const target={x:shoulder.x,y:shoulder.z};
  const normal=unit({x:a.p.x-target.x,y:a.p.y-target.y});
  if(!normal.x&&!normal.y)continue;
  const contact:PhysicalContact={intent:'teammate',limb:'support-hand',
   anchor:{target:'teammate',id:lead.id,point:shoulder,
    normal:{x:normal.x,y:0,z:normal.y}},
   startedAt:s.seconds,releasedAt:null};
  const e={from,acquireReach:SUPPORT_ACQUIRE_REACH,
   retainReach:SUPPORT_RELEASE_REACH,
   lineClear:world.isClear(sourcePoint(from),target,s.doors)};
  if(!contactWithinReach(contact,e,!!previous&&
    previous.releasedAt===null&&sameContact(contact,previous)))continue;
  options.push({claim:{contact,reach:e},
   score:Math.hypot(shoulder.x-from.x,shoulder.y-from.y,
     shoulder.z-from.z)});
 }
 options.sort((a,b)=>a.score-b.score||
    a.claim.contact.anchor.id.localeCompare(b.claim.contact.anchor.id));
 const retained=previous&&previous.releasedAt===null?
   options.find(o=>sameContact(o.claim.contact,previous)):null;
 return (retained??options[0])?.claim??null;
}
function contactOwnersForActor(s:Session,a:TeamActor):ContactOwners{
 const now=s.seconds;
 const throwActive=now-a.lastThrowAt>=0&&now-a.lastThrowAt<.70;
 const doorActive=!!a.doorHandContact||
   now-a.lastDoorAt>=0&&now-a.lastDoorAt<1.12&&
     a.lastDoorMethod!=='kick';
 const pushActive=now-a.lastBashAt>=0&&now-a.lastBashAt<.53&&
   a.lastBashRole==='push';
 const guardActive=now-a.lastHitAt>=0&&now-a.lastHitAt<1.1&&
   a.lastHitRegion!=='leg'&&a.aim<.2;
 return resolvePoseContactOwners({surrender:a.surrendered,
  down:a.health<=0,downProgress:a.health<=0?1:0,
  treatmentActive:a.treatmentActive,reloadActive:a.reload>0,
  reloadProgress:a.reloadDuration>0?
   clamp(1-a.reload/a.reloadDuration,0,1):0,
  reloadMode:a.reloadMode??'emergency',throwActive,
  pushActive,woundedGuard:guardActive,doorActive});
}
export function contextualSupportAllowed(
 s:Session,a:TeamActor,owners:ContactOwners):boolean{
 if(a.side!=='blue'||a.health<=0||a.surrendered||
  a.traversal||a.traversalPending||a.squeeze||
  a.pace==='run'||a.reload>0||a.treatmentActive||
  a.targetId!==null||a.aim>.24||a.velocity>7||
  a.doorHandContact||a.carryingId||a.carriedById||
  a.flashUntil>s.seconds||a.plan[0]?.kind==='tool'||
  a.plan[0]?.kind==='door'||a.plan[0]?.kind==='move'&&
    !a.plan[0]?.stackDoorId||a.plan[0]?.moveMode==='sprint')
  return false;
 return owners.action==='hold'&&owners.left==='weapon';
}
/** Called exactly once after the actual motor phase, never on render.
 * All anchors are observational; this only changes the support hand pose.
 */
export function advanceContextualSupportContacts(s:Session):void{
 const world=sessionWorldGeometry(s);
 for(const a of s.operators){
  const previous=a.physicalContact;
  // A recorded release must finish before any different contact begins.
  if(previous?.releasedAt!==null&&previous!==null){
   if(s.seconds-previous.releasedAt<SUPPORT_RELEASE_WINDOW)continue;
   a.physicalContact=null;
  }
  const current=a.physicalContact;
  // The real TOOL order and physical keyway have precedence over ordinary
  // idle bracing and teammate support. Never acquire two support contacts.
  const order=a.plan[0];
  if(order?.kind==='tool'&&order.toolMethod==='pick'&&
     a.actionTimer>0){
   const door=s.doors.find(d=>d.id===order.doorId);
   const next=door?lockpickContactCandidate(s,a,door,current):null;
   if(next&&current?.intent==='tool'&&current.releasedAt===null&&
      sameContact(next,current)){
    a.physicalContact={...next,startedAt:current.startedAt};
   }else if(current?.releasedAt===null){
    a.physicalContact=releasePhysicalContact(current,s.seconds);
   }else if(next&&!current){
    a.physicalContact=next;
   }
   continue;
  }
  if(current?.intent==='tool'){
   if(current.releasedAt===null)
    a.physicalContact=releasePhysicalContact(current,s.seconds);
   continue;
  }
  const owners=contactOwnersForActor(s,a);
  const allowed=contextualSupportAllowed(s,a,owners);
  if(!allowed){
   if(current?.releasedAt===null)
    a.physicalContact=releasePhysicalContact(current,s.seconds);
   continue;
  }
  // A genuine close aligned stack outranks decorative world bracing;
  // otherwise prefer retaining the current surface to prevent twitching.
  const team=chooseTeammateSupport(s,a,world,current);
  const surface=team?null:chooseEnvironmentSupport(s,a,world,current);
  const candidate=(team??surface);
  const choice=candidate?selectPhysicalContact([candidate],
    owners,s.seconds,current):null;
  if(choice){
   if(current?.releasedAt===null&&sameContact(current,choice)){
    // Geometry follows the actual leader and wall, but the grip clock is
    // stable and recorded once at first valid physical acquisition.
    a.physicalContact={...choice,startedAt:current.startedAt};
   }else if(current?.releasedAt===null){
    a.physicalContact=releasePhysicalContact(current,s.seconds);
   }else a.physicalContact=choice;
  }else if(current?.releasedAt===null){
   a.physicalContact=releasePhysicalContact(current,s.seconds);
  }
 }
}
