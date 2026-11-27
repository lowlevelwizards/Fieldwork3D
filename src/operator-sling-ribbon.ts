/** SR2 — one fixed-capacity flat webbing strip, no new per-frame meshes.
 * Coordinates are chest-local and already fitted by the routing owner.
 * Every knot shares a pair of vertices, preventing gaps at bends. */
import * as THREE from 'three';
export const SLING_RIBBON_CAPACITY=20;
export type SlingRibbonKnot=Readonly<{point:THREE.Vector3;normal:THREE.Vector3}>;
export function createSlingRibbonGeometry(){
 const geometry=new THREE.BufferGeometry();
 const vertices=SLING_RIBBON_CAPACITY*2;
 geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(vertices*3),3).setUsage(THREE.DynamicDrawUsage));
 const uv=new Float32Array(vertices*2);
 const index=new Uint16Array((SLING_RIBBON_CAPACITY-1)*6);
 for(let i=0;i<SLING_RIBBON_CAPACITY;i++){
  uv[i*4]=0;uv[i*4+1]=i;uv[i*4+2]=1;uv[i*4+3]=i;
  if(i===SLING_RIBBON_CAPACITY-1)break;
  const a=i*2;index.set([a,a+1,a+2,a+1,a+3,a+2],i*6);
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
 geometry.setIndex(new THREE.BufferAttribute(index,1));
 geometry.setDrawRange(0,0);
 return geometry;
}
const tangent=new THREE.Vector3(),side=new THREE.Vector3(),previous=new THREE.Vector3(),
 normal=new THREE.Vector3(),vertex=new THREE.Vector3();
export function updateSlingRibbonGeometry(geometry:THREE.BufferGeometry,
 knots:readonly SlingRibbonKnot[],width:number):boolean{
 const n=knots.length;
 if(n<2||n>SLING_RIBBON_CAPACITY||!Number.isFinite(width)||width<=0||
  knots.some(k=>![k.point.x,k.point.y,k.point.z,k.normal.x,k.normal.y,k.normal.z].every(Number.isFinite))){
  geometry.setDrawRange(0,0);return false;
 }
 const position=geometry.getAttribute('position'),normals=geometry.getAttribute('normal');
 previous.set(0,0,0);
 for(let i=0;i<n;i++){
  const k=knots[i];
  tangent.copy(knots[Math.min(n-1,i+1)].point).sub(knots[Math.max(0,i-1)].point);
  if(tangent.lengthSq()<1e-8)tangent.copy(knots[Math.min(n-1,i+1)].point).sub(k.point);
  if(tangent.lengthSq()<1e-8)tangent.set(0,1,0);
  tangent.normalize();
  side.crossVectors(tangent,k.normal);
  if(side.lengthSq()<1e-8)side.copy(previous).addScaledVector(tangent,-previous.dot(tangent));
  if(side.lengthSq()<1e-8){
   side.set(Math.abs(tangent.x)<.8?1:0,0,Math.abs(tangent.x)<.8?0:1);
   side.addScaledVector(tangent,-side.dot(tangent));
  }
  side.normalize();
  if(i&&side.dot(previous)<0)side.negate();
  previous.copy(side);
  normal.crossVectors(side,tangent).normalize();
  if(normal.dot(k.normal)<0)normal.negate();
  for(let j=0;j<2;j++){
   vertex.copy(k.point).addScaledVector(side,(j?1:-1)*width*.5);
   position.setXYZ(i*2+j,vertex.x,vertex.y,vertex.z);
   normals.setXYZ(i*2+j,normal.x,normal.y,normal.z);
  }
 }
 position.needsUpdate=true;normals.needsUpdate=true;
 geometry.setDrawRange(0,(n-1)*6);
 // This small mesh is rig-local. The rig owns its lifetime; the renderer
 // disables per-strip culling so stale capacity vertices cannot hide it.
 return true;
}
