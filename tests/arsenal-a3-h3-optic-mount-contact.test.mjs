/** A3.H3 — real geometry contact, not generic nominal optic offsets.
 * All visual placement is cosmetic; equipment resolver values are immutable.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,setWeaponAttachment,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories}
 from '../src/breach-weapon-accessories.ts';
import {opticVisualSeat} from '../src/weapons/geometry/optic-visual-seating.ts';
import {HK_CLAW_VISUAL} from '../src/weapons/geometry/hk-rail-accessories.ts';
import {WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER}
 from '../src/weapons/geometry/weapon-visual-palette.ts';
const materials=[WEAPON_ACCESSORY_STEEL,WEAPON_ACCESSORY_POLYMER];
const samples=[
 ['ar-m4a1','carbine','optic-reflex',false,false],
 ['ar-m4a1','carbine','optic-magnified',false,false],
 ['ak-ak74m','rifle','optic-reflex',false,true],
 ['ak-ak74m','rifle','optic-magnified',false,true],
 ['hk-g3a3','rifle','optic-reflex',true,false],
 ['hk-g3a3','rifle','optic-magnified',true,false],
 ['hk-hk33a2','rifle','optic-reflex',true,false],
 ['hk-hk53a3','carbine','optic-magnified',true,false],
 ['hk-mp5a3','smg','optic-reflex',true,false]
];
const bounds=x=>new THREE.Box3().setFromObject(x);
const nearly=(a,b,tolerance=.025)=>Math.abs(a-b)<=tolerance;
const ray=(root,x,z)=>new THREE.Raycaster(
 new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0),0,20
).intersectObjects(root.children,true);
const dispose=g=>g.traverse(x=>{if(x instanceof THREE.Mesh)x.geometry.dispose()});
for(const [name,weapon,optic,hk,ak] of samples){
 test('A3.H3 supported, visually seated and non-floating: '+name+' / '+optic,()=>{
  let cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),name);
  if(ak)cfg=setConfiguredFamilyPart(cfg,'handguard','ak-rail-long');
  if(hk)cfg=setWeaponAttachment(cfg,'opticMount','optic-hk-claw');
  cfg=setWeaponAttachment(cfg,'optic',optic);
  assert.equal(cfg.slots.optic,optic,'configured optic unexpectedly refused');
  const before=resolveWeaponAssembly(cfg);
  const seat=opticVisualSeat(cfg,before.mounted.optic.mountX);
  const body=buildWeaponSilhouette(cfg.weapon,...materials,cfg);
  const extras=buildWeaponAccessories(cfg,...materials);
  let feet=[];
  if(optic==='optic-reflex'){
   const foot=extras.getObjectByName('weapon-accessory-optic-reflex-base');
   assert.ok(foot instanceof THREE.Mesh);
   assert.ok(nearly(bounds(foot).min.y,seat.supportY,.004));
   feet=[seat.x];
  }else{
   const supports=extras.getObjectByName('weapon-accessory-optic-magnified-mounts');
   assert.ok(supports instanceof THREE.Mesh);
   assert.ok(nearly(bounds(supports).min.y,seat.supportY,.004));
   feet=[seat.x-1.65,seat.x+1.45];
  }
  for(const x of feet){
   const contacts=ray(body,x,0).filter(hit=>hit.point.y<=seat.supportY+.04);
   assert.ok(contacts.length>0,'no real receiver/rail below scope support x='+x);
   const top=contacts[0].point.y;
   assert.ok(Math.abs(top-seat.supportY)<.12,
    'optic floats/sinks above actual geometry '+name+' '+optic+
    ': seatY='+seat.supportY+' top='+top+' x='+x);
  }
  if(hk){
   const claw=body.getObjectByName('family-art-hk-claw-assembly');
   assert.ok(claw instanceof THREE.Mesh);
   assert.equal(claw.userData.hkClawFeet,4);
   assert.equal(body.children.filter(x=>x.name==='family-art-hk-claw-assembly').length,1);
   assert.ok(nearly(bounds(claw).max.y,HK_CLAW_VISUAL.supportTopY,.004));
   assert.ok(HK_CLAW_VISUAL.supportTopY<4,'claw adapter no longer towering');
   const roofTop=hk&&name.startsWith('hk-mp5')?1.75:1.85;
   assert.ok(bounds(claw).min.y<=roofTop+.02,'HK feet not seated in receiver');
  }
  // No geometry redesign may mutate the gameplay assembly.
  const after=resolveWeaponAssembly(cfg);
  assert.strictEqual(after,before);
  const reference=resolveWeaponAssembly(cfg).mounted.optic;
  assert.equal(reference.id,optic);
  dispose(extras);clearWeaponSilhouette(body);
 });
}
test('A3.H3 neither optic type adds per-frame work or new attachment IDs',()=>{
 for(const [name,weapon,optic,hk,ak] of samples){
  let cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),name);
  if(ak)cfg=setConfiguredFamilyPart(cfg,'handguard','ak-rail-long');
  if(hk)cfg=setWeaponAttachment(cfg,'opticMount','optic-hk-claw');
  cfg=setWeaponAttachment(cfg,'optic',optic);
  const a=buildWeaponAccessories(cfg,...materials);
  const b=buildWeaponAccessories(cfg,...materials);
  const first=a.children.filter(m=>m.name.includes('optic-'));
  const second=b.children.filter(m=>m.name.includes('optic-'));
  assert.equal(first.length,optic==='optic-reflex'?2:5);
  for(let i=0;i<first.length;i++){
   assert.notStrictEqual(first[i].geometry,second[i].geometry);
   assert.strictEqual(first[i].material,second[i].material);
  }
  dispose(a);dispose(b);
 }
});
