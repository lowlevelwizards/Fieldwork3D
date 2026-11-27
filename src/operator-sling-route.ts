/** SR3: deterministic chest-local route around the visible equipment.
 * Knots and normals are reused by the one ribbon. Routes remain visual
 * only. More detailed harness passage and pack fitting follow SR4/SR7. */
import * as THREE from 'three';
import type {EquipmentExterior} from './operator-equipment-exterior.ts';
import type {RetentionPoseMode} from './breach-weapon-retention-pose.ts';
import type {SlingRibbonKnot} from './operator-sling-ribbon.ts';
export const SLING_ROUTE_KNOTS=10;
export function createSlingRoute():SlingRibbonKnot[]{
 return Array.from({length:SLING_ROUTE_KNOTS},()=>({
  point:new THREE.Vector3(),normal:new THREE.Vector3()
 }));
}
export function routeSlingRibbon(out:readonly SlingRibbonKnot[],
 rear:THREE.Vector3,front:THREE.Vector3,fit:EquipmentExterior,
 retention?:RetentionPoseMode,width=1.05){
 const back=retention==='back-slung';
 const side=retention==='side-slung';
 const face=back?-1:1;
 const shoulderSign: -1|1=side?(rear.z+front.z>=0?-1:1):-1;
 const hipSign: -1|1=shoulderSign===-1?1:-1;
 const margin=width*.6+.16;
 const shoulder=fit.shoulder(shoulderSign);
 const z=shoulder[2],sy=shoulder[1]+margin;
 const high=3.8,low=-3.5;
 const surface=(f:number,y:number,lateral:number)=>
  (f===1?fit.front(y,lateral):fit.back(y,lateral))+f*margin;
 const flank=fit.side(low,0,hipSign)+hipSign*margin;
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
 write(1,startX,high,z,face,0,0);
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
