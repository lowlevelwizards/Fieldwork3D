/** A3.1: authoritative stylized 2.5D friendly body protection.
 * This representation is deliberately conservative. All callers supplying
 * only {x,y} keep the previous unconditional 10.5-unit planar veto.
 * These are shot/weapon safety volumes, never movement collision shapes.
 */
import type {Pt} from './breach-core.ts';
export type FriendlySafetyBody=Pt&{posture?:'stand'|'crouch';coverStanceDrop?:number};
export type FriendlyBodyActor={p:Pt;posture?:'stand'|'crouch';coverStanceDrop?:number};
export const LEGACY_FRIENDLY_RADIUS=10.5;
/** Fixed protective cylinders include skin, equipment/helmet and margin.
 * Torso and head overlap vertically; no gap appears at neck height.
 * Coordinates share Breach's existing ground-zero/weapon-height scale.
 */
export const FRIENDLY_STAND_VOLUMES=[
 {radius:10.5,bottom:0,top:29},
 {radius:8.5,bottom:20,top:42}
] as const;
export const FRIENDLY_CROUCH_VOLUMES=[
 {radius:10.5,bottom:0,top:15},
 {radius:8.5,bottom:10,top:26}
] as const;
/** The posture is committed fixed-step tactical state, not the render blend.
 * Do NOT infer tactical clearance from interpolated visual 3D joints. */
export function safetyBodyFor(a:FriendlyBodyActor):FriendlySafetyBody{
 // Preserve the old structural safety contract for historical/fixture
 // actors without a committed cover height. Never add a synthetic field.
 return a.coverStanceDrop===undefined?
  {x:a.p.x,y:a.p.y,posture:a.posture}:
  {x:a.p.x,y:a.p.y,posture:a.posture,
   coverStanceDrop:a.coverStanceDrop};
}
/** Segment versus a finite vertical cylinder. Compute the ENTIRE horizontal
 * intersection interval before testing ray height; center-only checks let
 * sloping shots enter the side of a head undetected.
 */
function segmentIntersectsCylinder(from:Pt,to:Pt,fromHeight:number,
 toHeight:number,center:Pt,radius:number,bottom:number,top:number):boolean{
 const dx=to.x-from.x,dy=to.y-from.y;
 const ox=from.x-center.x,oy=from.y-center.y;
 const qa=dx*dx+dy*dy;
 if(qa<1e-10){
  if(ox*ox+oy*oy>radius*radius)return false;
  const min=Math.min(fromHeight,toHeight),max=Math.max(fromHeight,toHeight);
  return !Number.isFinite(min)||!Number.isFinite(max)||
   max>=bottom&&min<=top;
 }
 const qb=2*(ox*dx+oy*dy),qc=ox*ox+oy*oy-radius*radius;
 const disc=qb*qb-4*qa*qc;
 // Allow a tiny roundoff margin at exact body-cylinder tangency: this
 // is a conservative *known 3D volume* check, not the legacy flat rule.
 if(disc<-1e-8*qa)return false;
 const root=Math.sqrt(Math.max(0,disc)),lo=Math.max(0,(-qb-root)/(2*qa));
 const hi=Math.min(1,(-qb+root)/(2*qa));
 if(lo>hi)return false;
 if(!Number.isFinite(fromHeight)||!Number.isFinite(toHeight))return true;
 const heightDelta=toHeight-fromHeight;
 const a=fromHeight+heightDelta*lo,b=fromHeight+heightDelta*hi;
 return Math.max(a,b)>=bottom&&Math.min(a,b)<=top;
}
/** Reads only the known physical posture. A caller without posture remains
 * guarded by the old flat disk at ANY height, including weapon probes. */
export function friendIntersectsTrajectory(from:Pt,fromHeight:number,to:Pt,
 toHeight:number,friend:FriendlySafetyBody):boolean{
 if(friend.posture!=='stand'&&friend.posture!=='crouch'){
  // Byte-for-byte equivalent to the previous planar projection predicate,
  // including the STRICT radius check (the boundary itself was clear).
  const dx=to.x-from.x,dy=to.y-from.y,total=Math.hypot(dx,dy);
  if(total<=.0001)return false;
  const ux=dx/total,uy=dy/total;
  const px=friend.x-from.x,py=friend.y-from.y;
  const along=px*ux+py*uy,across=Math.abs(px*uy-py*ux);
  const nearest=Math.max(0,Math.min(total,along));
  const axial=along-nearest;
  return axial*axial+across*across<
   LEGACY_FRIENDLY_RADIUS*LEGACY_FRIENDLY_RADIUS;
 }
 const volumes=friend.posture==='crouch'?
  FRIENDLY_CROUCH_VOLUMES:FRIENDLY_STAND_VOLUMES;
 const drop=friend.coverStanceDrop??0;
 // Boots remain on the ground; torso/helmet protection moves with chest.
 // Preserve the original conservative center overlap and gear margin.
 return volumes.some(v=>segmentIntersectsCylinder(from,to,fromHeight,
  toHeight,friend,v.radius,v.bottom,Math.max(v.bottom+1,v.top-drop)));
}
