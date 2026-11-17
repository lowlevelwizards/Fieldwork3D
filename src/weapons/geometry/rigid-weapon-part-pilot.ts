/** M3.0C2 experimental, EXPLICIT opt-in modular part compilation.
 *
 * Never invoked by the live builder. Unlike the shotgun, modular body parts
 * are selectable and magazines are operated individually by the reload rig.
 * This pilot combines ONLY direct, static, opaque siblings of the same
 * installed body slot and part ID, retaining the canonical family-* prefix
 * for existing Workbench part picking. Caller can restore the originals.
 *
 * No cross-slot, cross-material or cross-instance batching: performance wins
 * need real WebGL proof before the production hook is authorized.
 */
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import type {FamilyPartSlot} from '../../equipment-weapon-families.ts';

type RigidSlot=Exclude<FamilyPartSlot,'magazine'>;
type Candidate={mesh:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
 material:THREE.MeshStandardMaterial};
export type RigidPartPilotResult=Readonly<{
 slot:RigidSlot;partId:string;sourceMeshes:number;compiledMeshes:number;
 avoidedSubmissions:number;restore:()=>void;commit:()=>void
}>;
function candidate(child:THREE.Object3D,slot:RigidSlot,partId:string):
 Candidate|null{
 if(!(child instanceof THREE.Mesh)||child instanceof THREE.InstancedMesh||
  child instanceof THREE.SkinnedMesh||!child.visible||child.children.length||
  child.userData&&Object.keys(child.userData).length||
  child.customDepthMaterial||child.customDistanceMaterial||
  !(child.geometry instanceof THREE.BufferGeometry)||
  !(child.material instanceof THREE.MeshStandardMaterial)||
  child.material.transparent||child.material.opacity!==1||
  child.material.alphaTest!==0||!child.material.depthWrite||
  !child.material.depthTest||child.renderOrder!==0||
  child.morphTargetInfluences?.length)return null;
 // Confirm the entire identity, not merely a prefix matching another part.
 const prefix='family-'+slot+'-'+partId+'-';
 if(!child.name.startsWith(prefix)||
  !/^\d+$/.test(child.name.slice(prefix.length)))return null;
 return {mesh:child as Candidate['mesh'],material:child.material};
}
function compatible(a:THREE.BufferGeometry,b:THREE.BufferGeometry){
 if(Boolean(a.index)!==Boolean(b.index))return false;
 const keys=Object.keys(a.attributes).sort();
 if(keys.join('/')!==Object.keys(b.attributes).sort().join('/'))return false;
 return keys.every(k=>a.attributes[k].itemSize===b.attributes[k].itemSize&&
  a.attributes[k].normalized===b.attributes[k].normalized);
}
export function compileRigidWeaponPartPilot(root:THREE.Group,
 slot:RigidSlot,partId:string):RigidPartPilotResult{
 const buckets=new Map<THREE.MeshStandardMaterial,Map<string,Candidate[]>>();
 for(const child of root.children){
  const item=candidate(child,slot,partId);
  if(!item)continue;
  const mesh=item.mesh;
  const key=[mesh.castShadow,mesh.receiveShadow,mesh.layers.mask,
   mesh.frustumCulled,Boolean(mesh.geometry.index),
   Object.keys(mesh.geometry.attributes).sort().map(k=>{
    const a=mesh.geometry.attributes[k];
    return k+':'+a.itemSize+':'+a.normalized;
   }).join('/')].join('|');
  const byKey=buckets.get(item.material)??new Map<string,Candidate[]>();
  const matches=byKey.get(key)??[];
  matches.push(item);byKey.set(key,matches);
  buckets.set(item.material,byKey);
 }
 const compiled:{mesh:THREE.Mesh;originals:THREE.Mesh[]}[]=[];
 for(const bucketsByKey of buckets.values())
  for(const items of bucketsByKey.values()){
   if(items.length<2||items.some(item=>
    !compatible(items[0].mesh.geometry,item.mesh.geometry)))continue;
   const parts=items.map(({mesh})=>{
    mesh.updateMatrix();
    return mesh.geometry.clone().applyMatrix4(mesh.matrix);
   });
   const merged=mergeGeometries(parts,false);
   parts.forEach(g=>g.dispose());
   if(!merged)continue;
   const first=items[0].mesh;
   const model=new THREE.Mesh(merged,first.material);
   model.name='family-'+slot+'-'+partId+'-compiled';
   model.castShadow=first.castShadow;
   model.receiveShadow=first.receiveShadow;
   model.layers.mask=first.layers.mask;
   model.frustumCulled=first.frustumCulled;
   compiled.push({mesh:model,originals:items.map(x=>x.mesh)});
  }
 for(const batch of compiled){
  for(const original of batch.originals)root.remove(original);
  root.add(batch.mesh);
 }
 let completed=false;
 const originals=compiled.flatMap(batch=>batch.originals);
 const restore=()=>{
  if(completed)return;completed=true;
  for(const batch of compiled){
   root.remove(batch.mesh);batch.mesh.geometry.dispose();
   for(const original of batch.originals)root.add(original);
  }
 };
 const commit=()=>{
  if(completed)return;completed=true;
  // Only a future explicit production integration may call commit, AFTER
  // viewport/raycast/contacts and WebGL parity validation.
  for(const original of originals)original.geometry.dispose();
 };
 return {slot,partId,sourceMeshes:originals.length,
  compiledMeshes:compiled.length,
  avoidedSubmissions:originals.length-compiled.length,restore,commit};
}
