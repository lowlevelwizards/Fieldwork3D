/** Derived inspection hit markers for the *actual* stylized part envelopes.
 * Computes when configuration/mode changes, not on animation frames.
 * The authoritative combat socket definitions remain in weapon assemblies.
 */
import * as THREE from 'three';
import type {WeaponConfiguration} from '../../equipment-weapon-assemblies.ts';
import {workbenchMounts,type WorkbenchMode,type WorkbenchMount}
 from '../../equipment-weapon-workbench-layout.ts';
import type {FamilyPartSlot} from '../../equipment-weapon-families.ts';

export function partVisualBounds(root:THREE.Object3D,slot:FamilyPartSlot):
 THREE.Box3|null{
 const bounds=new THREE.Box3();let found=false;
 root.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||
   !object.name.startsWith('family-'+slot+'-'))return;
  object.updateMatrix();
  // Instanced rail teeth own their own combined bounds; the unit-cube
  // geometry bound is not their complete visible footprint.
  if(object instanceof THREE.InstancedMesh){
   if(!object.boundingBox)object.computeBoundingBox();
   if(object.boundingBox){
    bounds.union(object.boundingBox.clone().applyMatrix4(object.matrix));
    found=true;
   }
   return;
  }
  if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
  const box=object.geometry.boundingBox;
  if(!box)return;
  bounds.union(box.clone().applyMatrix4(object.matrix));
  found=true;
 });
 return found?bounds:null;
}
export function workbenchVisualAnchors(config:WeaponConfiguration,
 root:THREE.Object3D,mode:WorkbenchMode):WorkbenchMount[]{
 const authored=workbenchMounts(config,mode);
 if(!config.build)return authored;
 const boxes=new Map<FamilyPartSlot,THREE.Box3>();
 for(const slot of ['stock','receiver','grip','magazine','handguard','barrel'] as const){
  const box=partVisualBounds(root,slot);
  if(box)boxes.set(slot,box);
 }
 return authored.map(mount=>{
  const bodySlot=mount.slot.startsWith('body-');
  const slot=bodySlot?mount.slot.slice(5) as FamilyPartSlot:
   mount.slot==='optic'?'receiver':
   mount.slot==='muzzle'?'barrel':
   mount.slot==='foregrip'||mount.slot==='light'?'handguard':
   mount.slot==='stock'||mount.slot==='sling'?'stock':null;
  const box=slot?boxes.get(slot):undefined;
  if(!box)return mount;
  const mid=box.getCenter(new THREE.Vector3());
  let x=mid.x,y=mid.y;
  if(mount.slot==='muzzle')x=box.max.x-.55;
  if(mount.slot==='optic')y=box.max.y-.35;
  if(mount.slot==='foregrip')y=box.min.y+.3;
  if(mount.slot==='light')x=box.max.x-1.8;
  if(mount.slot==='sling')x=box.min.x+1.2;
  return {...mount,x,y,z:box.max.z+.6};
 });
}
