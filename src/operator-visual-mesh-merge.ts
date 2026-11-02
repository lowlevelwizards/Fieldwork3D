/** Combine rigid, single-material parts after kit construction.
 * Preserves category visibility and all simulation transforms, while reducing
 * draw calls on iOS. Dynamic magazine slots and articulated limbs stay separate.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function consolidateVisualGroup(group:THREE.Group):void{
 const buckets=new Map<THREE.Material,THREE.Mesh[]>();
 for(const item of group.children){
  if(!(item instanceof THREE.Mesh)||item.children.length||
    Array.isArray(item.material))continue;
  const bucket=buckets.get(item.material)??[];
  bucket.push(item);buckets.set(item.material,bucket);
 }
 for(const [material,meshes] of buckets){
  if(meshes.length<2)continue;
  const geometryParts=meshes.map(item=>{
   item.updateMatrix();
   return item.geometry.clone().applyMatrix4(item.matrix);
  });
  const combined=mergeGeometries(geometryParts,false);
  for(const source of geometryParts)source.dispose();
  if(!combined)continue;
  for(const part of meshes){
   group.remove(part);
   part.geometry.dispose();
  }
  const mesh=new THREE.Mesh(combined,material);
  mesh.castShadow=true;mesh.receiveShadow=true;
  group.add(mesh);
 }
}
