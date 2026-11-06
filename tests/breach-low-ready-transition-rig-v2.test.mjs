import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const make=()=>{
 const weaponConfiguration=selectWeaponFamilyPreset(
  initialWeaponConfiguration('carbine'),'ar-m4a1');
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor','armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-none');
 const wardrobe={...initialWardrobe(),styles:{
  ...initialWardrobe().styles,top:'bdu-shirt',
  armorStyle:'plate-jpc',rigStyle:'no-rig'}};
 return {x:0,z:0,heading:0,velocity:0,seconds:1,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,
  reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:false,firing:false,
  turning:0,aimBlend:0,handlingOverride:'low',
  equipment,wardrobe,weaponConfiguration};
};
test('live low-ready/ADS switch does not teleport weapon or wrists',()=>{
 const rig=createOperatorRig('rook','blue',true),base=make();
 const position=()=>rig.weapon.position.clone();
 const hands=()=>rig.arms.map(a=>a.hand.position.clone());
 poseOperator(rig,base,0);
 assert.equal(rig.root.userData.lowReadyPoseReport?.status,'clear');
 const low=position(),lowHands=hands();
 poseOperator(rig,{...base,seconds:1.01,aiming:true,aimBlend:1,
  handlingOverride:'ads'},.01);
 assert.ok(position().distanceTo(low)<.001,
  'first transition frame must preserve previous rigid weapon');
 assert.ok(hands().every((v,i)=>v.distanceTo(lowHands[i])<.001),
  'hands must not teleport at transition entry');
 poseOperator(rig,{...base,seconds:1.12,aiming:true,aimBlend:1,
  handlingOverride:'ads'},.08);
 assert.ok(position().distanceTo(low)>0);
 for(const hand of hands())assert.ok(hand.toArray().every(Number.isFinite));
 poseOperator(rig,{...base,seconds:1.42,aiming:true,aimBlend:1,
  handlingOverride:'ads'},.08);
 const ads=position();
 poseOperator(rig,{...base,seconds:1.43},.01);
 assert.ok(position().distanceTo(ads)<.001,
  'return to low-ready begins at the last rendered ADS transform');
 poseOperator(rig,{...base,seconds:1.85},.08);
 assert.equal(rig.root.userData.lowReadyPoseReport?.status,'clear');
 assert.ok(position().distanceTo(low)<.03);
 rig.dispose();
});
