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
 const margin=width*.48+.32;
 const lane=fit.slingShoulder(shoulderSign,width);
 const shoulder=lane.crown;
 const z=shoulder[2],sy=Math.max(shoulder[1],back&&pack?pack.max.y:shoulder[1])+margin;
 const single=profile?.kind==='single';
 const high=profile?.entryHeight??3.8,low=profile?.returnHeight??-3.5;
 const surface=(f:number,y:number,lateral:number)=>
  (f===1?fit.front(y,lateral):packedRearSurface(fit.back(y,lateral),y,lateral,pack))+f*margin;
 const flank=(pack?hipSign*Math.max(Math.abs(fit.side(low,0,hipSign)),Math.abs(hipSign===1?pack.max.z:pack.min.z)):fit.side(low,0,hipSign))+hipSign*margin;
 // Use the central panel extent at the wrap corners: diagonal bridges
 // must never cut through the pouch at the edge of the torso.
 const startX=surface(face,high,z);
 const crownFront=face*Math.max(Math.abs(startX),Math.abs(surface(face,5.2,z)));
 const crownBack=surface(-face,5.2,z);
 const faceEdge=(f:number,y:number,z0:number,z1:number)=>{
  let v=surface(f,y,z0);
  for(let i=1;i<=8;i++){const q=surface(f,y,z0+(z1-z0)*i/8);v=f===1?Math.max(v,q):Math.min(v,q);}
  return v;
 };
 const lowerBack=faceEdge(-face,low,0,flank*.8);
 const lowerFront=faceEdge(face,low,0,flank*.8);
 const write=(i:number,x:number,y:number,z:number,nx:number,ny:number,nz:number)=>{
  out[i].point.set(x,y,z);out[i].normal.set(nx,ny,nz).normalize();
 };
 write(0,rear.x,rear.y,rear.z,face,0,side?hipSign:0);
 // The narrow modeled split can accept a front-entry lane; all other
 // combinations retain the unobstructed exterior route.
 const entry=!back?lane.frontEntry:undefined;
 if(entry)write(1,entry[0]+.10,entry[1],entry[2],1,0,0);
 else write(1,startX,high,z,face,0,0);
 write(2,crownFront,sy,z,face,1,0);
 write(3,crownBack,sy,z,-face,1,0);
 write(4,surface(-face,high,z),high,z,-face,0,0);
 write(5,lowerBack,low,flank*.65,-face,0,hipSign*.5);
 write(6,lowerBack,low,flank,-face,0,hipSign);
 write(7,lowerFront,low,flank,face,0,hipSign);
 write(8,lowerFront,low,flank*.70,face,0,hipSign*.5);
 write(9,front.x,front.y,front.z,face,0,side?hipSign:0);
 if(single){
  // One receiver socket, a short shared drop, and a continuous body loop.
  // Both branches meet at the same junction, not at opposite gun ends.
  const jx=Math.max(rear.x+.10,faceEdge(1,Math.min(3.5,rear.y+2.25),rear.z,rear.z));
  const jy=Math.min(5.1,rear.y+2.25),jz=rear.z*.88;
  write(1,jx,jy,jz,1,0,0);
  write(2,crownFront,sy,z,face,1,0);
  write(8,jx+.035,jy,jz,1,0,0);
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
   a.point.y=Math.max(a.point.y,fit.shoulder(-1)[1]+width*.6+.16);
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

/** Densify the fixed route into shared contact bends. Each span is sampled
 * against the entire authored face at its intermediate point, including
 * pouch width and pack depth. Socket and shoulder crown stay exact.
 * No extra scene objects or per-frame geometry traversal. */
export const SLING_CONTACT_KNOTS=SLING_ROUTE_KNOTS*2-1;
export function createSlingContactRoute():SlingRibbonKnot[]{
 return Array.from({length:SLING_CONTACT_KNOTS},()=>({point:new THREE.Vector3(),normal:new THREE.Vector3()}));
}
export function fitSlingContactRoute(out:readonly SlingRibbonKnot[],path:readonly SlingRibbonKnot[],
 fit:EquipmentExterior,width:number,pack?:THREE.Box3,slack=0){
 const margin=width*.5+.26;
 const face=(p:THREE.Vector3,sign:number)=>{
  let v=sign===1?-Infinity:Infinity;
  for(const dy of [-width*.5,0,width*.5])for(const dz of [-width*.5,0,width*.5]){
   const x=sign===1?fit.front(p.y+dy,p.z+dz):
    packedRearSurface(fit.back(p.y+dy,p.z+dz),p.y+dy,p.z+dz,pack);
   v=sign===1?Math.max(v,x):Math.min(v,x);
  }
  return v+sign*margin;
 };
 const project=(k:SlingRibbonKnot)=>{
  const p=k.point,n=k.normal;
  if(p.y>fit.shoulder(-1)[1]+margin*.7)return;
  if(p.y< -9)return;
  // At wrap corners remain on the front/back surface until beyond the
  // flank, then travel alongside the body. Never use a diagonal chord.
  const sign=p.z<0?-1:1;
  const edge=Math.abs(fit.side(p.y,p.x,sign))+margin;
  const onSide=Math.abs(n.z)>Math.abs(n.x)*1.2||Math.abs(p.z)>edge-.10&&Math.abs(n.z)>.25;
  if(onSide){
   let side=Math.abs(fit.side(p.y,p.x,sign))+margin;
   if(pack&&p.y>=pack.min.y-margin&&p.y<=pack.max.y+margin&&p.x>=pack.min.x-margin&&p.x<=pack.max.x+margin)
    side=Math.max(side,Math.abs(sign===1?pack.max.z:pack.min.z)+margin);
   p.z=sign*Math.max(Math.abs(p.z),side);
  }else{
   const s=n.x<0?-1:1;
   const bound=face(p,s);
   p.x=s===1?Math.max(p.x,bound):Math.min(p.x,bound);
  }
 };
 for(let i=0;i<out.length;i++){
  const a=path[Math.floor(i/2)],b=path[Math.min(path.length-1,Math.ceil(i/2))],k=out[i];
  k.point.copy(a.point).lerp(b.point,i%2?.5:0);
  k.normal.copy(a.normal).lerp(b.normal,i%2?.5:0);
  if(k.normal.lengthSq()<.0001)k.normal.copy(a.normal);
  k.normal.normalize();
  if(i===0||i===out.length-1)continue;
  // Small slack only on the free socket spans. The load-bearing shoulder
  // and textile contacts are unchanged, and a moving endpoint stays exact.
  if(i===1||i===out.length-2)k.point.y-=Math.max(0,Math.min(.35,slack));
  project(k);
 }
 return out;
}
