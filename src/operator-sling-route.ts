/** SR3: deterministic chest-local route around the visible equipment.
 * Knots and normals are reused by the one ribbon. Routes remain visual
 * only. More detailed harness passage and pack fitting follow SR4/SR7. */
import * as THREE from 'three';
import type {EquipmentExterior} from './operator-equipment-exterior.ts';
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';
import {packedRearSurface} from './operator-retention-pack.ts';
import type {SlingArtProfile} from './operator-sling-profile.ts';
import type {SlingRibbonKnot} from './operator-sling-ribbon.ts';
export const SLING_ROUTE_KNOTS=10;
export function createSlingRoute():SlingRibbonKnot[]{
 return Array.from({length:SLING_ROUTE_KNOTS},()=>({
  point:new THREE.Vector3(),normal:new THREE.Vector3()
 }));
}
export function routeSlingRibbon(out:readonly SlingRibbonKnot[],
 rear:THREE.Vector3,front:THREE.Vector3,fit:EquipmentExterior,
 retention?:RetentionPoseMode,width=1.05,pack?:THREE.Box3,profile?:SlingArtProfile){
 const back=retention==='back-slung';
 const side=retention==='side-slung';
 const face=back?-1:1;
 const shoulderSign: -1|1=-1; // fixed shoulder prevents a mid-frame mirrored route
 const hipSign: -1|1=shoulderSign===-1?1:-1;
 const margin=Math.min(.25,width*.16);
 const shoulder=fit.shoulder(shoulderSign);
 const z=shoulder[2],sy=Math.max(shoulder[1],pack?pack.max.y:shoulder[1])+margin;
 const single=profile?.kind==='single';
 const low=profile?.returnHeight??-3.5;
 const surface=(f:number,y:number,lateral:number)=>
  (f===1?fit.front(y,lateral):packedRearSurface(fit.back(y,lateral),y,lateral,pack))+f*margin;
 // A few decisive contact points. Straight runs between the actual
 // anchors are intentional; small textile intersections are preferable
 // to a stair-step route that looks like rigid tubing.
 const write=(i:number,x:number,y:number,z:number,nx:number,ny:number,nz:number)=>{
  out[i].point.set(x,y,z);out[i].normal.set(nx,ny,nz).normalize();
 };
 const mix=(i:number,a:number,b:number,t:number)=>{
  out[i].point.copy(out[a].point).lerp(out[b].point,t);
  out[i].normal.copy(out[a].normal).lerp(out[b].normal,t).normalize();
 };
 const crownFace=(f:number)=>f===-1&&pack&&z>=pack.min.z-margin&&z<=pack.max.z+margin?
  Math.min(surface(f,5.2,z),pack.min.x-margin):surface(f,5.2,z);
 const crownX=crownFace(face),oppositeX=crownFace(-face);
 const flank=hipSign*Math.max(Math.abs(fit.side(low,0,hipSign)),
  pack&&low>=pack.min.y&&low<=pack.max.y?Math.abs(hipSign===1?pack.max.z:pack.min.z):0)+hipSign*.18;
 const corner=(f:number)=>f*Math.max(...[0,.4,.82].map(t=>f*surface(f,low,flank*t)));
 const farCorner=corner(-face),nearCorner=corner(face);
 write(0,rear.x,rear.y,rear.z,face,0,side?hipSign:0);
 write(2,crownX,sy,z,face,1,0);
 write(3,oppositeX,sy,z,-face,1,0);
 write(6,farCorner,low,flank,-face,0,1);
 write(7,nearCorner,low,flank,face,0,1);
 write(9,front.x,front.y,front.z,face,0,side?hipSign:0);
 // Only lift a straight diagonal when a substantial obstruction
 // actually crosses it. A broad, gentle rise is preferable to a kink.
 const clearDiagonal=(a:number,b:number,i:number,t:number,sign:number)=>{
  mix(i,a,b,t);
  const p=out[i].point;
  const edge=surface(sign,p.y,p.z);
  const penetration=sign*(edge-p.x);
  if(penetration>.65)p.x+=sign*(penetration-.40);
 };
 clearDiagonal(0,2,1,.5,face);
 clearDiagonal(3,6,4,.33,-face);
 clearDiagonal(3,6,5,.67,-face);
 clearDiagonal(7,9,8,.5,face);
 if(single){
  const jy=rear.y+2.25,jz=rear.z*.88;
  const jx=Math.max(rear.x+.10,surface(1,jy,jz));
  write(1,jx,jy,jz,1,0,0);
  write(8,jx+.09,jy,jz,1,0,0);
 }
 return out;
}

/** SR11: interpolate the body route as the weapon travels around the side.
 * The socket knots stay exact. Crown knots travel above the shoulder;
 * lower knots sweep around the exterior rather than lerp through the chest.
 * The alternate route uses the same fixed-capacity scratch for every frame. */
export function routeSlingTransition(out:readonly SlingRibbonKnot[],
 alternate:readonly SlingRibbonKnot[],rear:THREE.Vector3,front:THREE.Vector3,
 fit:EquipmentExterior,retention:RetentionPoseMode|undefined,width:number,
 pack:THREE.Box3|undefined,weight:number,profile?:SlingArtProfile){
 if(retention!=='back-slung'||weight>=1)
  return routeSlingRibbon(out,rear,front,fit,retention,width,pack,profile);
 routeSlingRibbon(out,rear,front,fit,undefined,width,pack,profile);
 if(weight<=.5)return out;
 routeSlingRibbon(alternate,rear,front,fit,'back-slung',width,pack,profile);
 const t=Math.max(0,Math.min(1,(weight-.5)*2)),f=t*t*(3-2*t);
 for(let i=1;i<out.length-1;i++){
  const a=out[i],b=alternate[i],oldX=a.point.x,oldZ=a.point.z;
  a.point.lerp(b.point,f);
  a.normal.lerp(b.normal,f);
  if(i===2||i===3){ // crown stays outside both shoulder/pack top
   a.point.y=Math.max(a.point.y,fit.shoulder(-1)[1]+Math.min(.25,width*.16));
  }else{
   const sign=i<=4?-1:1;
   const start=Math.atan2(sign*Math.abs(oldZ),oldX);
   const end=Math.atan2(sign*Math.abs(b.point.z),b.point.x);
   const angle=start+(end-start)*f,c=Math.cos(angle),s=Math.sin(angle);
   const y=a.point.y,margin=width*.6+.16;
   const xEdge=Math.abs(c>=0?fit.front(y,0):packedRearSurface(fit.back(y,0),y,0,pack))+margin;
   const zEdge=Math.abs(fit.side(y,0,sign))+margin;
   const radius0=Math.hypot(oldX,oldZ)*(1-f)+Math.hypot(b.point.x,b.point.z)*f;
   const surfaceRadius=Math.min(xEdge/Math.max(.001,Math.abs(c)),zEdge/Math.max(.001,Math.abs(s)));
   const radius=radius0+Math.max(0,surfaceRadius-radius0)*Math.sin(Math.PI*f);
   a.point.x=c*radius;a.point.z=s*radius;
   // Blend the radial normal along the same arc (no zero-vector flip).
   a.normal.set(c,0,s);
  }
  if(a.normal.lengthSq()<1e-8)a.normal.set(0,1,0);
  a.normal.normalize();
 }
 return out;
}

/** Subdivide straight spans for stable ribbon normals, not extra bends.
 * No extra scene objects or per-frame geometry traversal. */
export const SLING_CONTACT_KNOTS=SLING_ROUTE_KNOTS*2-1;
export function createSlingContactRoute():SlingRibbonKnot[]{
 return Array.from({length:SLING_CONTACT_KNOTS},()=>({point:new THREE.Vector3(),normal:new THREE.Vector3()}));
}
export function fitSlingContactRoute(out:readonly SlingRibbonKnot[],path:readonly SlingRibbonKnot[],
 fit:EquipmentExterior,width:number,pack?:THREE.Box3,slack=0){
 // Preserve the simple diagonal route; intermediate vertices do not
 // independently snap to different surfaces. Small slack only on free ends.
 void fit;void width;void pack;
 for(let i=0;i<out.length;i++){
  const a=path[Math.floor(i/2)],b=path[Math.min(path.length-1,Math.ceil(i/2))],k=out[i];
  k.point.copy(a.point).lerp(b.point,i%2?.5:0);
  k.normal.copy(a.normal).lerp(b.normal,i%2?.5:0);
  if(k.normal.lengthSq()<.0001)k.normal.copy(a.normal);
  k.normal.normalize();
  if(i===1||i===out.length-2)k.point.y-=Math.max(0,Math.min(.18,slack*.5));
 }
 return out;
}
