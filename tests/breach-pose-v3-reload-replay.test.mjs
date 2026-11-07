/** V3 reload visual-only replay/interruption critical contract.
 * No validity inflation. Every exact timestamp must reconstruct the same
 * presentation after replay seek, repeated calls, or a canceled reload.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const fixtures=[
 {id:'ar-m4a1',weapon:'carbine',armor:'plate-heavy'},
 {id:'ak-akm',weapon:'rifle',armor:'plate-legacy'}
];
const base=f=>{
 let equipment=initialEquipmentLoadout(f.weapon);
 equipment=setEquipmentChoice(equipment,'armor','armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 const w=initialWardrobe();
 const wardrobe={...w,styles:{...w.styles,top:'smock-jacket',
  armorStyle:f.armor,rigStyle:'full-chest'}};
 return {x:0,z:0,heading:0,velocity:0,seconds:2,stride:0,
  posture:'stand',injury:0,weapon:f.weapon,reload:0,
  reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:false,firing:false,turning:0,
  aimBlend:0,handlingOverride:'low',deterministic:true,
  poseV3Preview:true,equipment,wardrobe,
  weaponConfiguration:selectWeaponFamilyPreset(
   initialWeaponConfiguration(f.weapon),f.id)};
};
const snapshot=r=>{
 r.root.updateMatrixWorld(true);
 const point=o=>o.getWorldPosition(new THREE.Vector3());
 const spin=o=>o.getWorldQuaternion(new THREE.Quaternion());
 return {gun:point(r.weapon),gunQ:spin(r.weapon),
  left:point(r.arms[0].hand),right:point(r.arms[1].hand),
  mag:r.detachedMagazine.visible?point(r.detachedMagazine):null};
};
const equal=(a,b,label)=>{
 for(const k of ['gun','left','right']){
  assert.ok(a[k].distanceTo(b[k])<1e-6,label+'/'+k);
 }
 assert.ok(a.gunQ.angleTo(b.gunQ)<1e-6,label+'/gunQ');
 assert.equal(!!a.mag,!!b.mag,label+'/mag visibility');
 if(a.mag)assert.ok(a.mag.distanceTo(b.mag)<1e-6,label+'/mag');
};
test('V3 seek to reload phase reproduces the same weapon, hands and magazine',()=>{
 for(const fixture of fixtures){
  const state=base(fixture);
  const played=createOperatorRig(fixture.id,'blue',true);
  const sought=createOperatorRig(fixture.id,'blue',true);
  try{
   for(const p of [.04,.2,.37,.61,.78,.92]){
    const pose={...state,seconds:2+2*p,reload:1.8*(1-p)};
    // Step through prior pose(s) on the same rig first. The second rig
    // starts directly at the sought timestamp without any motion history.
    poseOperator(played,pose,0);
    poseOperator(sought,pose,0);
    equal(snapshot(played),snapshot(sought),
     fixture.id+'/same timestamp '+p);
    // A repeated pose at the same timestamp must not accumulate chest
    // assistance or drift a weapon contact.
    const first=snapshot(played);
    poseOperator(played,pose,0);
    equal(snapshot(played),first,
     fixture.id+'/repeat timestamp '+p);
   }
  }finally{played.dispose();sought.dispose();}
 }
});
test('V3 canceled reload returns to normal ADS without retained body offsets',()=>{
 for(const fixture of fixtures){
  const state=base(fixture);
  const fromReload=createOperatorRig(fixture.id,'blue',true);
  const direct=createOperatorRig(fixture.id,'blue',true);
  try{
   poseOperator(fromReload,{...state,seconds:2.6,reload:1.18},0);
   const destination={...state,seconds:2.7,reload:0,
    aiming:true,aimBlend:1,handlingOverride:'ads'};
   poseOperator(fromReload,destination,0);
   poseOperator(direct,destination,0);
   equal(snapshot(fromReload),snapshot(direct),
    fixture.id+'/cancel reload -> ADS');
  }finally{fromReload.dispose();direct.dispose();}
 }
});
