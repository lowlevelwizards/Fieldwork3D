/** L2.14 — read-only, mesh-exact inspection of actually carried equipment.
 * Never constructs replacement display models or changes the equipment ledger.
 * A concealed item has no visible mesh: do not highlight a substitute pouch.
 */
import * as THREE from 'three';
import type {OperatorRig} from './breach-operator-rig.ts';
import type {EquipmentLoadout} from './equipment-loadouts.ts';
import type {FieldCarryLocation,FieldItemId} from './equipment-field-inventory.ts';
import {visibleDoorWedges,visibleFlashCanisters,visibleFlexCuffs}
 from './equipment-field-visuals.ts';

export type EquipmentInspectionTarget={
 kind:'field'|'magazine'|'medical'|'utility'|'armor'|'rig'|'belt'|'backpack';
 id?:string;location?:FieldCarryLocation;index?:number;
};
const visible=(mesh:THREE.Object3D):boolean=>{
 for(let part:THREE.Object3D|null=mesh;part;part=part.parent)
  if(!part.visible)return false;
 return true;
};
const first=(list:readonly THREE.Object3D[],index=0)=>
 list.filter(visible)[Math.max(0,Math.floor(index))]??null;

/** The returned object belongs to the LIVE shared rig. Nothing is cloned. */
export function inspectEquipmentMesh(rig:OperatorRig,
 kit:EquipmentLoadout|undefined,target:EquipmentInspectionTarget):THREE.Object3D|null{
 const index=target.index??0,loc=target.location;
 if(target.kind==='field'){
  const id=target.id as FieldItemId;
  if(id==='flashbang'){
   const records=visibleFlashCanisters(kit);
   return first(rig.flashCanisters.filter((_mesh,i)=>
    (!loc||records[i]?.location===loc)&&!!records[i]),index);
  }
  if(id==='wedge'){
   const records=visibleDoorWedges(kit);
   return first(rig.wedgeMeshes.filter((_mesh,i)=>
    (!loc||records[i]?.location===loc)&&!!records[i]),index);
  }
  if(id==='zip-tie'){
   const records=visibleFlexCuffs(kit);
   return first(rig.cuffMeshes.filter((_mesh,i)=>
    (!loc||records[i]?.location===loc)&&!!records[i]),index);
  }
  return null; // Unimplemented catalog items never receive phantom models.
 }
 if(target.kind==='magazine'){
  // A magazine inside a closed backpack is real inventory but is not a
  // visibly mounted individual magazine; never highlight a nearby pouch.
  if(loc==='backpack')return null;
  const magazines=rig.visualKit.magazines;
  return first(loc?magazines[loc]??[]:
   [...magazines.rig,...magazines.belt,...magazines.pocket],index);
 }
 if(target.kind==='medical')return first([rig.medicalPouch]);
 if(target.kind==='utility')return first([rig.utilityTool,rig.radioUnit]);
 if(target.kind==='backpack')
  return first([rig.visualKit.dayPack,rig.visualKit.fieldPack]);
 if(target.kind==='rig')
  return first([rig.visualKit.chestRig,rig.visualKit.fieldWebbing]);
 if(target.kind==='belt')return first([rig.visualKit.belt,rig.beltPouch]);
 if(target.kind==='armor')
  return first([rig.visualKit.plateCarrier,rig.visualKit.softArmor]);
 return null;
}
export type VisualInspectionResult={
 visible:boolean;label:string;center?:THREE.Vector3;size?:THREE.Vector3;
};
const bounds=new THREE.Box3();
/** World-space real mesh bounds, including its articulated parent transform. */
export function measureEquipmentMesh(mesh:THREE.Object3D|null):VisualInspectionResult{
 if(!mesh||!visible(mesh))return {visible:false,label:'NOT EXTERNALLY VISIBLE'};
 mesh.updateWorldMatrix(true,true);
 bounds.setFromObject(mesh,true);
 if(bounds.isEmpty())return {visible:false,label:'NO DRAWABLE MODEL'};
 const center=bounds.getCenter(new THREE.Vector3());
 const size=bounds.getSize(new THREE.Vector3());
 return {visible:true,label:'PHYSICAL MESH',center,size};
}
