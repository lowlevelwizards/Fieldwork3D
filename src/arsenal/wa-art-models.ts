/** WA0.3 isolated WebGL reference capture; no gameplay or persistence writes. */
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from './catalog.ts';
import {collectCustomArtCases,type CustomArtCase} from './wa0-custom-reference-cases.ts';
import {SIDEARM_PREVIEW_REFERENCES,buildSidearmPreview,clearSidearmPreview} from '../weapons/geometry/sidearm-preview.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment} from '../equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../breach-weapon-accessories.ts';
import {weaponVisualLayout} from '../weapons/geometry/weapon-visual-layout.ts';
import {WEAPON_ACCESSORY_STEEL as steel,WEAPON_ACCESSORY_POLYMER as dark} from '../weapons/geometry/weapon-visual-palette.ts';

type Primary=(typeof ARSENAL_REFERENCES)[number];
type Sidearm=(typeof SIDEARM_PREVIEW_REFERENCES)[number];
export type Entry={id:string;name:string;platform:string;status:string;primary?:Primary;sidearm?:Sidearm;equipped?:boolean;custom?:CustomArtCase};
export const refs:Entry[]=[
 ...ARSENAL_REFERENCES.map(primary=>({id:primary.id,name:primary.name,platform:primary.platformId,status:'primary-reference',primary})),
 ...SIDEARM_PREVIEW_REFERENCES.map(sidearm=>({id:sidearm.id,name:sidearm.name,platform:sidearm.family,status:sidearm.family==='beretta'?'preview-only':'issued-sidearm-appearance',sidearm}))
];
// Representative accepted accessory choices; no claim of exhaustive coverage.
const equippedIds=new Set(['ar-m4a1','ak-ak74m','hk-g3a3','hk-mp5a3','g36-ka4','fal-5000','fnc-service']);
export const equipped=refs.filter(r=>equippedIds.has(r.id)).map(r=>({...r,id:r.id+'-equipped',platform:'accessory-samples',equipped:true}));
const customCoverage=collectCustomArtCases();
export const customEntries:Entry[]=customCoverage.cases.map(custom=>({id:custom.id,name:custom.name,platform:custom.platform,status:'custom-part-sample',custom}));
export function construct(entry:Entry){
 if(entry.sidearm){
  const model=buildSidearmPreview(entry.sidearm.id);
  const id=entry.sidearm.id;
  return {model,accepted:[] as string[],cleanup:()=>clearSidearmPreview(id,model)};
 }
 if(!entry.custom&&!entry.primary)throw Error('Missing authored art reference: '+entry.id);
 let config=entry.custom?entry.custom.config:selectWeaponFamilyPreset(initialWeaponConfiguration(entry.primary!.legacy.weapon),entry.primary!.id);
 const accepted:string[]=[];
 if(entry.equipped){
  if(config.build?.family==='hk')config=setWeaponAttachment(config,'opticMount','optic-hk-claw');
  for(const [slot,id] of [['optic','optic-reflex'],['light','light-compact'],['muzzle','muzzle-suppressor'],['foregrip','foregrip-vertical']] as const){
   const next=setWeaponAttachment(config,slot,id);
   if(next.slots[slot]===id){accepted.push(id);config=next;}
  }
 }
 const body=buildWeaponSilhouette(config.weapon,steel,dark,config);
 const accessories=buildWeaponAccessories(config,steel,dark);
 const model=new THREE.Group();model.add(body,accessories);
 model.scale.x=weaponVisualLayout(config).longitudinalScale;
 return {model,accepted,cleanup:()=>{clearWeaponSilhouette(body);accessories.traverse(n=>{if(n instanceof THREE.InstancedMesh)n.dispose();if(n instanceof THREE.Mesh)n.geometry.dispose();});accessories.clear();}};
}
export function bounds(model:THREE.Group){
 model.updateMatrixWorld(true);const b=new THREE.Box3();
 model.traverseVisible(n=>{
  if(!(n instanceof THREE.Mesh))return;
  if(n instanceof THREE.InstancedMesh){n.computeBoundingBox();if(n.boundingBox)b.union(n.boundingBox.clone().applyMatrix4(n.matrixWorld));}
  else{if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();if(n.geometry.boundingBox)b.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld));}
 });
 if(b.isEmpty())throw Error('Empty artwork bounds');return b;
}
