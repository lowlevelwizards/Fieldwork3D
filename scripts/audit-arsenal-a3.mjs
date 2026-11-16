/** A3 render cost census: actual accepted equipment + production builders.
 * Historical A2 mesh baselines below are sourced from its boxed primitives
 * and duplicated HK code path, not claims about frame timing.
 */
import {writeFileSync,mkdirSync} from 'node:fs';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setWeaponAttachment,
 setConfiguredFamilyPart} from '../src/equipment-weapon-assemblies.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const samples=[
 {id:'ar-m4a1',accessories:{optic:'optic-magnified',muzzle:'muzzle-suppressor',
  foregrip:'foregrip-vertical',light:'light-compact',sling:'sling-two-point'},
  a2Meshes:6+1+2+4+2},
 {id:'ak-ak74m',handguard:'ak-rail-long',
  accessories:{optic:'optic-reflex',muzzle:'muzzle-suppressor',
   foregrip:'foregrip-vertical',light:'light-compact',sling:'sling-two-point'},
  a2Meshes:3+1+2+4+2},
 {id:'hk-g3a3',accessories:{opticMount:'optic-hk-claw',optic:'optic-reflex',
  muzzle:'muzzle-suppressor',light:'light-compact',sling:'sling-two-point'},
  a2Meshes:8+3+1+4+2},
 {id:'hk-hk33a2',accessories:{opticMount:'optic-hk-claw',optic:'optic-reflex',
  muzzle:'muzzle-suppressor',light:'light-compact'},a2Meshes:8+3+1+4},
 {id:'hk-hk53a3',accessories:{opticMount:'optic-hk-claw',optic:'optic-reflex',
  muzzle:'muzzle-suppressor',light:'light-compact'},a2Meshes:8+3+1+4},
 {id:'hk-mp5a3',handguard:'hk-mp5-trirail',
  accessories:{opticMount:'optic-hk-claw',optic:'optic-reflex',
   muzzle:'muzzle-suppressor',foregrip:'foregrip-vertical',
   light:'light-compact',sling:'sling-two-point'},a2Meshes:8+3+1+1+2+4+2},
 {id:'hk-mp5sd3',accessories:{light:'light-compact',sling:'sling-two-point'},
  a2Meshes:4+2},
 {id:'fal-5000',accessories:{muzzle:'muzzle-suppressor',
  light:'light-compact',sling:'sling-two-point'},a2Meshes:1+4+2},
 {id:'fnc-service',accessories:{muzzle:'muzzle-suppressor',
  light:'light-compact',sling:'sling-two-point'},a2Meshes:1+4+2}
];
function audit(){
 const report=[];
 for(const sample of samples){
  const p=FAMILY_PRESETS.find(x=>x.id===sample.id);
  if(!p)throw Error('Missing A3 platform '+sample.id);
  let c=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),sample.id);
  if(sample.handguard){
   c=setConfiguredFamilyPart(c,'handguard',sample.handguard);
   if(c.build?.parts.handguard!==sample.handguard)throw Error('Invalid fore-end '+p.id);
  }
  for(const [slot,id] of Object.entries(sample.accessories)){
   c=setWeaponAttachment(c,slot,id);
   if(c.slots[slot]!==id)throw Error('Invalid equipped A3 accessory '+p.id+' '+id);
  }
  const mats=[WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER];
  const body=buildWeaponSilhouette(c.weapon,...mats,c);
  const extra=buildWeaponAccessories(c,...mats);
  const meshes=[];
  for(const root of [body,extra])
   root.traverse(x=>{if(x instanceof THREE.Mesh)meshes.push(x)});
  const geometry=meshes.reduce((t,mesh)=>{
   const g=mesh.geometry;
   return t+Math.round((g.index?g.index.count:g.attributes.position.count)/3)*
    (mesh.isInstancedMesh?mesh.count:1);
  },0);
  const accessoryMeshes=extra.children.filter(x=>x instanceof THREE.Mesh).length;
  const hkClaw=body.children.filter(x=>x.name.startsWith('family-art-hk-claw')).length;
  const doubleGrip=body.children.filter(x=>x.name.includes('trirail-vertical-grip')).length;
  const cost=accessoryMeshes+hkClaw+doubleGrip;
  report.push({preset:sample.id,a2AccessoryDraws:sample.a2Meshes,
   a3AccessoryDraws:cost,reduction:sample.a2Meshes-cost,
   equipped:sample.accessories,allWeaponMeshes:meshes.length,allWeaponTriangles:geometry});
  extra.traverse(x=>{if(x instanceof THREE.Mesh)x.geometry.dispose()});
  clearWeaponSilhouette(body);
 }
 return {
  schema:'fieldwork-arsenal-a3',version:1,
  source:'actual geometry census; A2 counts from previous box-assembly source',
  totals:{samples:report.length,previousAccessoryDraws:report.reduce((n,x)=>n+x.a2AccessoryDraws,0),
   currentAccessoryDraws:report.reduce((n,x)=>n+x.a3AccessoryDraws,0)},
  samples:report
 };
}
export const auditArsenalA3=audit;
if(process.argv[1]&&process.argv[1].endsWith('audit-arsenal-a3.mjs')){
 const report=audit();mkdirSync('reports',{recursive:true});
 writeFileSync('reports/arsenal-a3-cost-inventory.json',JSON.stringify(report,null,2)+'\n');
 console.log('A3 nine-platform accessory render calls:',
  report.totals.previousAccessoryDraws,'→',report.totals.currentAccessoryDraws);
 for(const x of report.samples)
  console.log(x.preset,':',x.a2AccessoryDraws,'→',x.a3AccessoryDraws,
   'draws; total triangles',x.allWeaponTriangles);
 if(report.totals.currentAccessoryDraws>=report.totals.previousAccessoryDraws)
  throw Error('A3 increased sample accessory draw calls');
}
