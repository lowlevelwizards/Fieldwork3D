import test from 'node:test';
import assert from 'node:assert/strict';
import {reloadVisualContact}
 from '../src/breach-reload-visual-contact.ts';
import * as THREE from 'three';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {evaluateArmConstraint}
 from '../src/breach-pose-v3-constraints.ts';
import {solveTwoBone,ARM_LIMITS} from '../src/breach-ik.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const overlap=(region,material,upperDepth,lowerDepth)=>({
 label:material==='rigid'?'torso':'chest-rig',material,region,
 depth:Math.max(upperDepth,lowerDepth),upperDepth,lowerDepth,
 allowed:.12,upperAllowed:.12,lowerAllowed:.12,
 upperExcess:Math.max(0,upperDepth-.12),
 lowerExcess:Math.max(0,lowerDepth-.12),blocking:true
});
test('B24b accepts modest armor penetration without ignoring the deep torso',()=>{
 const sample=(upper,lower,region='front-insert')=>({
  valid:false,hardDepth:Math.max(upper,lower),softDepth:0,quality:1,
  contacts:[overlap(region,'rigid',upper,lower)]
 });
 assert.equal(reloadVisualContact(sample(1.45,.3),false).valid,false);
 const allowed=reloadVisualContact(sample(1.45,.3),true);
 assert.equal(allowed.valid,true);
 assert.equal(allowed.strictValid,false);
 assert.equal(allowed.acceptedOverlaps,1);
 assert.equal(reloadVisualContact(sample(4,.3),true).valid,false);
 assert.equal(reloadVisualContact(sample(.15,2.1,'torso-core'),true).valid,false);
 assert.equal(reloadVisualContact(sample(.5,.1,'unknown'),true).valid,false);
});
test('B24b anatomical reach and normal aim never inherit reload tolerance',()=>{
 const shoulder=V(1,4,-7),wrist=V(8,-6,-7);
 const pose=solveTwoBone(shoulder,wrist,10,10,V(4,-8,-2),ARM_LIMITS);
 const env={armor:'plate-heavy',rig:'no-rig',top:'smock-jacket',
  front:7,boxes:[{label:'torso',material:'rigid',
   region:'torso-core',min:{x:-50,y:-50,z:-50},
   max:{x:50,y:50,z:50}}]};
 const a=evaluateArmConstraint({shoulder,arm:pose,side:-1,
  envelope:env,mode:'aim',allowReloadOverlap:true});
 const b=evaluateArmConstraint({shoulder,arm:pose,side:-1,
  envelope:env,mode:'reload',allowReloadOverlap:true});
 assert.equal(a.contactValid,a.strictContactValid);
 assert.equal(a.valid,false);
 assert.equal(b.valid,false,'no deep torso pass-through');
 assert.ok(a.reasons.includes('equipment-contact'));
});
test('B24b real heavy M4A1 preview reports strict vs visual contact separately',()=>{
 let equipment=initialEquipmentLoadout('carbine');
 equipment=setEquipmentChoice(equipment,'armor','armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 const w=initialWardrobe();
 const base={x:0,z:0,heading:0,velocity:0,seconds:3,stride:0,
  posture:'stand',injury:0,weapon:'carbine',
  reloadDuration:1.8,reload:1.8*(1-.40),
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,aimBlend:0,
  handlingOverride:'low',deterministic:true,poseV3Preview:true,
  equipment,wardrobe:{...w,styles:{...w.styles,top:'smock-jacket',
    armorStyle:'plate-heavy',rigStyle:'full-chest'}},
  weaponConfiguration:selectWeaponFamilyPreset(
    initialWeaponConfiguration('carbine'),'ar-m4a1')};
 const rig=createOperatorRig('v4-clearance-heavy','blue',true);
 try{
  poseOperator(rig,{...base,poseV4ReloadPreview:true},0);
  const report=rig.root.userData.poseV3CoordinatedReport;
  assert.ok(report);
  const arms=rig.root.userData.poseV3DynamicReport;
  assert.equal(arms?.length,2);
  assert.ok(arms.every(a=>Number.isFinite(a.hardDepth)));
  poseOperator(rig,{...base,poseV4ReloadPreview:false},0);
  const strict=rig.root.userData.poseV3CoordinatedReport;
  assert.ok(strict);
  assert.equal(strict.relaxedContact,false);
  assert.equal(strict.status,'unresolved');
 }finally{rig.dispose();}
});
