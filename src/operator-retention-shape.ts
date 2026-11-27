/** SR8: cache a bounded spatial support cloud from installed artwork.
 * Built only with a new weapon model, including visible accessories.
 * A global bounding box is retained as the compatibility fallback. */
import * as THREE from 'three';
const NX=10,NY=3,NZ=2;
export const MAX_RETENTION_SUPPORT_POINTS=NX*NY*NZ*8;
export type RetentionShape=readonly THREE.Vector3[];
export function retentionShape(roots:readonly THREE.Object3D[],bounds:THREE.Box3):RetentionShape{
 if(bounds.isEmpty())return [];
 const bins=Array.from({length:NX*NY*NZ},()=>new THREE.Box3());
 const size=bounds.getSize(new THREE.Vector3()),point=new THREE.Vector3();
 const cell=(v:number,min:number,span:number,n:number)=>
  Math.max(0,Math.min(n-1,Math.floor((v-min)/Math.max(.001,span)*n)));
 for(const root of roots){
  root.updateMatrixWorld(true);
  root.traverseVisible(node=>{
   if(!(node instanceof THREE.Mesh))return;
   const attr=node.geometry.getAttribute('position');
   if(!attr)return;
   for(let i=0;i<attr.count;i++){
    point.fromBufferAttribute(attr,i).applyMatrix4(node.matrixWorld);
    if(![point.x,point.y,point.z].every(Number.isFinite))continue;
    const x=cell(point.x,bounds.min.x,size.x,NX),
     y=cell(point.y,bounds.min.y,size.y,NY),
     z=cell(point.z,bounds.min.z,size.z,NZ);
    bins[(x*NY+y)*NZ+z].expandByPoint(point);
   }
  });
 }
 const points:THREE.Vector3[]=[];
 for(const b of bins)if(!b.isEmpty()){
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])
   for(const z of [b.min.z,b.max.z])points.push(new THREE.Vector3(x,y,z));
 }
 return points;
}
