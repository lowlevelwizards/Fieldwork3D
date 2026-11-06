import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {poseClearanceEnvelope,evaluateSleeveArmorContact}
 from '../src/breach-pose-clearance-envelope.ts';

function rigPose(r,id,armor,rigStyle,top,seconds=0){
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset);
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration(preset.weapon),preset.id);
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',armor==='armor-bare'?
  'armor-none':armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 kit=setEquipmentChoice(kit,'rig',rigStyle==='no-rig'?'rig-none':'rig-full');
 const wardrobe={...initialWardrobe(),styles:{
  top,armorStyle:armor,rigStyle,trousers:'bdu-trousers',
  headwear:'bare',beltStyle:'no-belt',packStyle:'no-pack'
 }};
 const pose={x:0,z:0,heading:0,velocity:0,seconds,stride:0,
  posture:'stand',injury:0,weapon:preset.weapon,reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  handlingOverride:'low',aimBlend:0,
  equipment:kit,wardrobe,weaponConfiguration:config};
 poseOperator(r,pose,0);
 return pose;
}
function actualArmDepth(arm,envelope){
 const axis=new THREE.Vector3(0,arm.upper.scale.y*.5,0)
  .applyQuaternion(arm.upper.quaternion);
 const shoulder=arm.upper.position.clone().sub(axis),
  elbow=arm.upper.position.clone().add(axis);
 return evaluateSleeveArmorContact(shoulder,elbow,arm.hand.position,
  envelope,1.65);
}
test('real rig consumes the SAME approved M4 arm solution it rendered',()=>{
 const rig=createOperatorRig('rook','blue',true);
 const pose=rigPose(rig,'ar-m4a1','plate-jpc','no-rig','bdu-shirt');
 const report=rig.root.userData.lowReadyPoseReport;
 assert.ok(report,'coupled fitter must be used in a stationary Studio pose');
 assert.deepEqual(report.fittingShoulders,
  [[1,4,-7],[1,4,7]],
  'Modular low-ready uses the shared physical shoulder frame');
 assert.equal(report.status,'clear');
 assert.ok(report.penetration<=.13);
 const envelope=poseClearanceEnvelope('plate-jpc','no-rig','bdu-shirt');
 for(const arm of rig.arms)
  assert.equal(actualArmDepth(arm,envelope).valid,true);
 const before=rig.arms.map(arm=>arm.hand.position.toArray());
 poseOperator(rig,{...pose,seconds:.55},0);
 assert.deepEqual(rig.arms.map(arm=>arm.hand.position.toArray()),before);
 poseOperator(rig,{...pose,seconds:.65,aiming:true,aimBlend:1,
  handlingOverride:'ads'},0);
 assert.equal(rig.root.userData.lowReadyPoseReport,null,
  'active aim cannot use the static coupled presentation solver');
 rig.dispose();
});
test('bulky faction rigs use a declared non-clipping guard fallback',()=>{
 const rig=createOperatorRig('moss','blue',true);
 const pose=rigPose(rig,'ak-akm','plate-standard','chicom-rig','bdu-shirt');
 const report=rig.root.userData.lowReadyPoseReport;
 assert.ok(report&&['clear','guard-fallback'].includes(report.status));
 assert.ok(report.penetration<=.13);
 const envelope=poseClearanceEnvelope('plate-standard','chicom-rig','bdu-shirt');
 for(const arm of rig.arms)
  assert.equal(actualArmDepth(arm,envelope).valid,true);
 poseOperator(rig,{...pose,seconds:1.0,reload:1,reloadDuration:2},0);
 assert.equal(rig.root.userData.lowReadyPoseReport,null);
 rig.dispose();
});
