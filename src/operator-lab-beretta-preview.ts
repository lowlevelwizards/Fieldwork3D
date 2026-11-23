/** Lab-only visual replacement in the genuine Glock draw/holster cradle.
 * Berettas are NOT issued sidearms. A temporary Glock drives the existing
 * read-only operator IK, while the actual M9 art sits at its own authored
 * holster pivot. No secondary game authority or saved kit is affected.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import {buildM9Appearance,m9ArtSockets,type M9AppearanceId}
 from './weapons/geometry/beretta-m9-silhouettes.ts';
type Preview={id:M9AppearanceId;cradle:THREE.Group;model:THREE.Group};
const previews=new WeakMap<OperatorRig,Preview>();
function release(model:THREE.Group){
 const geometry=new Set<THREE.BufferGeometry>();
 const materials=new Set<THREE.Material>();
 model.traverse(child=>{
  if(!(child instanceof THREE.Mesh))return;
  geometry.add(child.geometry);
  for(const m of Array.isArray(child.material)?child.material:[child.material])
   materials.add(m);
 });
 model.parent?.remove(model);
 for(const g of geometry)g.dispose();
 for(const m of materials)m.dispose();
 model.clear();
}
export function clearLabBerettaPreview(rig:OperatorRig):void{
 const previous=previews.get(rig);
 if(!previous)return;
 release(previous.model);
 for(const child of previous.cradle.children)child.visible=true;
 previews.delete(rig);
}
export function presentLabBerettaPreview(rig:OperatorRig,
 id:M9AppearanceId|null):void{
 if(!id){clearLabBerettaPreview(rig);return;}
 const cradle=rig.hip.getObjectByName('secondary-holstered-pistol');
 if(!(cradle instanceof THREE.Group)){
  clearLabBerettaPreview(rig);return;
 }
 const prior=previews.get(rig);
 if(prior?.id===id&&prior.cradle===cradle){
  for(const child of cradle.children)child.visible=child===prior.model;
  return;
 }
 clearLabBerettaPreview(rig);
 const model=buildM9Appearance(id);
 model.name='operator-lab-beretta-model';
 const pivot=m9ArtSockets(id).holsterPivot;
 model.position.set(-pivot.x,-pivot.y,-pivot.z);
 // The rig owns its materials; never dispose the Arsenal's shared palette.
 const materialClones=new Map<THREE.Material,THREE.Material>();
 const generatedMaterials=new Set<THREE.Material>();
 model.traverse(child=>{
  if(!(child instanceof THREE.Mesh))return;
  const sources=Array.isArray(child.material)?child.material:[child.material];
  const own=(m:THREE.Material)=>{
   let copy=materialClones.get(m);
   if(!copy){copy=m.clone();materialClones.set(m,copy);}
   return copy;
  };
  child.material=Array.isArray(child.material)?
   child.material.map(own):own(child.material);
  // M9's open-slide frame has a newly allocated double-sided material.
  // Our Lab-owned clone replaces it; release that original immediately.
  if(child.userData.m9OwnsMaterial)
   for(const material of sources)generatedMaterials.add(material);
 });
 for(const material of generatedMaterials)material.dispose();
 cradle.add(model);
 for(const child of cradle.children)child.visible=child===model;
 previews.set(rig,{id,cradle,model});
}
