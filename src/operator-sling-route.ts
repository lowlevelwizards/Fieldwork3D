/** SR3: deterministic chest-local route around the visible equipment.
 * Knots and normals are reused by the one ribbon. Routes remain visual
 * only. More detailed harness passage and pack fitting follow SR4/SR7. */
import * as THREE from 'three';
import type {EquipmentExterior} from './operator-equipment-exterior.ts';
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';
import {packedRearSurface} from './operator-retention-pack.ts';
import type {SlingRibbonKnot} from './operator-sling-ribbon.ts';
export const SLING_ROUTE_KNOTS=10;
export function createSlingRoute():SlingRibbonKnot[]{
 return Array.from({length:SLING_ROUTE_KNOTS},()=>({
  point:new THREE.Vector3(),normal:new THREE.Vector3()
 }));
}
export function routeSlingRibbon(out:readonly SlingRibbonKnot[],
 rear:THREE.Vector3,front:THREE.Vector3,fit:EquipmentExterior,
 retention?:RetentionPoseMode,width=1.05,pack?:THREE.Box3){
 const back=retention==='back-slung';
 const side=retention==='side-slung';
 const face=back?-1:1;
 const shoulderSign: -1|1=-1; // fixed shoulder prevents a mid-frame mirrored route
 const hipSign: -1|1=shoulderSign===-1?1:-1;
 const margin=width*.6+.16;
 const lane=fit.slingShoulder(shoulderSign,width);
 const shoulder=lane.crown;
 const z=shoulder[2],sy=Math.max(shoulder[1],back&&pack?pack.max.y:shoulder[1])+margin;
 const high=3.8,low=-3.5;
 const surface=(f:number,y:number,lateral:number)=>
  (f===1?fit.front(y,lateral):packedRearSurface(fit.back(y,lateral),y,lateral,back?pack:undefined))+f*margin;
 const flank=(back&&pack?hipSign*Math.max(Math.abs(fit.side(low,0,hipSign)),Math.abs(hipSign===1?pack.max.z:pack.min.z)):fit.side(low,0,hipSign))+hipSign*margin;
 // Use the central panel extent at the wrap corners: diagonal bridges
 // must never cut through the pouch at the edge of the torso.
 const startX=surface(face,high,z);
 const crownFront=face*Math.max(Math.abs(startX),Math.abs(surface(face,5.2,z)));
 const crownBack=surface(-face,5.2,z);
 const lowerBack=surface(-face,low,0);
 const lowerFront=surface(face,low,0);
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
 return out;
}

/** SR11: interpolate the body route as the weapon travels around the side.
 * The socket knots stay exact. Crown knots travel above the shoulder;
 * lower knots sweep around the exterior rather than lerp through the chest.
 * The alternate route uses the same fixed-capacity scratch for every frame. */
export function routeSlingTransition(out:readonly SlingRibbonKnot[],
 alternate:readonly SlingRibbonKnot[],rear:THREE.Vector3,front:THREE.Vector3,
 fit:EquipmentExterior,retention:RetentionPoseMode|undefined,width:number,
 pack:THREE.Box3|undefined,weight:number){
 if(retention!=='back-slung'||weight>=1)
  return routeSlingRibbon(out,rear,front,fit,retention,width,pack);
 routeSlingRibbon(out,rear,front,fit,undefined,width,pack);
 if(weight<=.5)return out;
 routeSlingRibbon(alternate,rear,front,fit,'back-slung',width,pack);
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
   const radius=Math.max(Math.hypot(a.point.x,a.point.z),
    Math.min(xEdge/Math.max(.001,Math.abs(c)),zEdge/Math.max(.001,Math.abs(s))));
   a.point.x=c*radius;a.point.z=s*radius;
   // Blend the radial normal along the same arc (no zero-vector flip).
   a.normal.set(c,0,s);
  }
  if(a.normal.lengthSq()<1e-8)a.normal.set(0,1,0);
  a.normal.normalize();
 }
 return out;
}
