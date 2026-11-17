/** M3.0C1: conservative legacy shotgun body compile at build time.
 *
 * The old shotgun is the ONLY supported visual weapon without selectable
 * family body slots or a removable authored magazine. All its 20 box meshes
 * are rigid, unnamed, and share two caller-owned materials. Merge inside each
 * material/pass group while preserving pixel UV, normals, shadows, bounds and
 * the original authored part dimensions. No caches or per-frame execution.
 *
 * This is intentionally NOT used for modular rifles: their named parts and
 * independently toggled magazine mesh belong to Workbench and reload logic.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const compatible=(a:THREE.BufferGeometry,b:THREE.BufferGeometry)=>{
 if(Boolean(a.index)!==Boolean(b.index))return false;
 const keys=Object.keys(a.attributes).sort();
 if(keys.join('/')!==Object.keys(b.attributes).sort().join('/'))return false;
 return keys.every(k=>a.attributes[k].itemSize===b.attributes[k].itemSize&&
  a.attributes[k].normalized===b.attributes[k].normalized);
};
/** Compile only complete groups whose constituent draw contract is identical. */
export function compileLegacyShotgunBody(root:THREE.Group){
 const groups=new Map<THREE.Material,THREE.Mesh[]>();
 for(const child of root.children){
  if(!(child instanceof THREE.Mesh)||child instanceof THREE.InstancedMesh||
   child instanceof THREE.SkinnedMesh||child.name||
   !child.visible||child.children.length||Object.keys(child.userData).length||
   !(child.geometry instanceof THREE.BufferGeometry)||
   Array.isArray(child.material)||child.material.transparent||
   child.material.opacity!==1||child.material.alphaTest!==0||
   child.material.depthWrite===false||child.material.depthTest===false||
   child.renderOrder!==0||child.customDepthMaterial||
   child.customDistanceMaterial)continue;
  const meshes=groups.get(child.material)??[];
  meshes.push(child);groups.set(child.material,meshes);
 }
 let sourceMeshes=0,compiledMeshes=0;
 for(const [material,meshes] of groups){
  if(meshes.length<2)continue;
  const first=meshes[0];
  const matches=meshes.every(mesh=>
   mesh.castShadow===first.castShadow&&
   mesh.receiveShadow===first.receiveShadow&&
   mesh.layers.mask===first.layers.mask&&
   mesh.frustumCulled===first.frustumCulled&&
   compatible(first.geometry,mesh.geometry));
  if(!matches)continue;
  const sections=meshes.map(mesh=>{
   mesh.updateMatrix();
   return mesh.geometry.clone().applyMatrix4(mesh.matrix);
  });
  const geometry=mergeGeometries(sections,false);
  for(const section of sections)section.dispose();
  if(!geometry)continue;
  const combined=new THREE.Mesh(geometry,material);
  combined.castShadow=first.castShadow;
  combined.receiveShadow=first.receiveShadow;
  combined.layers.mask=first.layers.mask;
  combined.frustumCulled=first.frustumCulled;
  // No animated part identity is removed; this name is diagnostic only.
  combined.name='legacy-shotgun-rigid-body-'+compiledMeshes;
  root.add(combined);
  for(const original of meshes){
   root.remove(original);
   original.geometry.dispose();
  }
  sourceMeshes+=meshes.length;
  compiledMeshes++;
 }
 return {sourceMeshes,compiledMeshes,
  avoidedSubmissions:sourceMeshes-compiledMeshes};
}
