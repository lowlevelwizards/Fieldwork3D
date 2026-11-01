/** One draw call for both sides of a physical wall patina surface.
 * Local coordinates match the authoritative wall body center/rotation.
 */
import * as THREE from 'three';
export function doubleSidedWallWear(length:number,height:number,offset=4.64):THREE.BufferGeometry{
 const half=Math.max(1,length)/2,high=Math.max(1,height)/2;
 const z=offset;
 const positions=new Float32Array([
  -half,-high,z,half,-high,z,half,high,z,-half,high,z,
  half,-high,-z,-half,-high,-z,-half,high,-z,half,high,-z,
 ]);
 const uvs=new Float32Array([
  0,0,1,0,1,1,0,1,
  0,0,1,0,1,1,0,1,
 ]);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2));
 geometry.setIndex([0,1,2,0,2,3,4,5,6,4,6,7]);
 geometry.computeVertexNormals();
 return geometry;
}
