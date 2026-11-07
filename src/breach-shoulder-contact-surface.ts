/** Read-only shoulder contact geometry sampler for the pose Lab.
 * Inputs are explicitly selected VISIBLE garment, armor-shoulder and rig-
 * shoulder groups, in the same fitted chest hierarchy as the operator.
 * Does not guess a position from equipment category, create physics or
 * traverse the entire rig every frame. Captured only on equipment changes.
 */
import * as THREE from 'three';
export type ShoulderMaterial='rigid'|'structured'|'soft';
export type ShoulderLayer='garment'|'armor-shoulder'|'rig-shoulder';
export type ShoulderContactSource={
 id:string;layer:ShoulderLayer;material:ShoulderMaterial;
 object:THREE.Object3D
};
export type ShoulderContactTriangle=Readonly<{
 id:string;layer:ShoulderLayer;material:ShoulderMaterial;
 center:readonly [number,number,number];
 normal:readonly [number,number,number];
 area:number;
}>;
export type ShoulderRegion=Readonly<{
 minX:number;maxX:number;minY:number;maxY:number;
 minSideZ:number;maxSideZ:number;
}>;
export const DEFAULT_SHOULDER_REGION:ShoulderRegion=Object.freeze({
 minX:-1,maxX:9,minY:1.5,maxY:8.5,minSideZ:4.25,maxSideZ:9.5
});

/** Model-space +X faces forward. Only exterior forward-facing triangles
 * in the anatomical shoulder band can potentially support a buttplate.
 * This is a candidate scan, NOT a decision that the triangle is loadable.
 * Contact normal and actual buttplate footprint are validated downstream.
 */
export function sampleVisibleShoulderSurfaces(
 chest:THREE.Object3D,
 sources:readonly ShoulderContactSource[],
 side:-1|1,
 region:ShoulderRegion=DEFAULT_SHOULDER_REGION
):readonly ShoulderContactTriangle[]{
 if(side!==-1&&side!==1)throw Error('Shoulder side must be -1 or 1');
 chest.updateMatrixWorld(true);
 const chestInverse=chest.matrixWorld.clone().invert();
 const transform=new THREE.Matrix4();
 const a=new THREE.Vector3(),b=new THREE.Vector3(),
  c=new THREE.Vector3(),ab=new THREE.Vector3(),
  ac=new THREE.Vector3(),normal=new THREE.Vector3(),
  center=new THREE.Vector3();
 const result:ShoulderContactTriangle[]=[];
 const within=(p:THREE.Vector3)=>{
  const z=side*p.z;
  return p.x>=region.minX&&p.x<=region.maxX&&
   p.y>=region.minY&&p.y<=region.maxY&&
   z>=region.minSideZ&&z<=region.maxSideZ;
 };
 for(const source of sources){
  if(!source.object.visible)continue;
  source.object.updateMatrixWorld(true);
  source.object.traverse(node=>{
   if(!(node instanceof THREE.Mesh)||!node.visible)return;
   const geom=node.geometry;
   const position=geom?.getAttribute('position');
   if(!position)return;
   transform.multiplyMatrices(chestInverse,node.matrixWorld);
   const indices=geom.index;
   const vertex=(i:number,target:THREE.Vector3)=>target.set(
     position.getX(i),position.getY(i),position.getZ(i)
   ).applyMatrix4(transform);
   const triangles=indices?indices.count/3:position.count/3;
   for(let i=0;i<triangles;i++){
    const ia=indices?indices.getX(i*3):i*3;
    const ib=indices?indices.getX(i*3+1):i*3+1;
    const ic=indices?indices.getX(i*3+2):i*3+2;
    vertex(ia,a);vertex(ib,b);vertex(ic,c);
    center.copy(a).add(b).add(c).multiplyScalar(1/3);
    if(!within(center))continue;
    ab.subVectors(b,a);ac.subVectors(c,a);
    normal.crossVectors(ab,ac);
    const doubleArea=normal.length();
    if(doubleArea<.0001)continue;
    normal.multiplyScalar(1/doubleArea);
    // Stock presses toward +X, not onto the reverse faces of straps.
    if(normal.x<.25)continue;
    result.push({
     id:source.id,layer:source.layer,material:source.material,
     center:[center.x,center.y,center.z] as const,
     normal:[normal.x,normal.y,normal.z] as const,
     area:doubleArea*.5
    });
   }
  });
 }
 // Stable order makes audits and eventual per-config caching deterministic.
 result.sort((a,b)=>b.center[0]-a.center[0]||
  b.area-a.area||a.id.localeCompare(b.id));
 return result;
}
