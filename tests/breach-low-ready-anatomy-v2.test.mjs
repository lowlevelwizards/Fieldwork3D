import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {assessLowReadyArm,assessLowReadyPair} from
 '../src/breach-low-ready-anatomy.ts';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from
 '../src/equipment-weapon-assemblies.ts';
import {lowReadyArchetype,LOW_READY_PASSES} from
 '../src/breach-low-ready-archetypes.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
test('upward and winged elbows are INVALID, not soft-penalty candidates',()=>{
 const shoulder=V(1,4,7),wrist=V(10,-5,4);
 assert.equal(assessLowReadyArm(shoulder,V(4,5,9),wrist,1,1).valid,false);
 assert.ok(assessLowReadyArm(shoulder,V(4,5,9),wrist,1,1).reasons.includes('elbow-up'));
 assert.equal(assessLowReadyArm(shoulder,V(4,-3,14),wrist,1,1).valid,false);
 assert.ok(assessLowReadyArm(shoulder,V(4,-3,14),wrist,1,1).reasons.includes('elbow-wing'));
 assert.equal(assessLowReadyArm(shoulder,V(4,-3,8.4),wrist,1,1).valid,true);
});
test('firing and support elbow validity is independently checked',()=>{
 const shoulders=[V(1,4,-7),V(1,4,7)];
 const wrists=[V(7,-4,-5),V(7,-4,5)];
 const good=assessLowReadyPair(shoulders,[V(3,-3,-8),V(3,-3,8)],wrists,[1.0,1.0]);
 const broken=assessLowReadyPair(shoulders,[V(3,-3,-8),V(3,4,8)],wrists,[1.0,1.0]);
 assert.equal(good.valid,true);
 assert.equal(broken.valid,false);
});
test('all modular family presets inherit a named authored silhouette',()=>{
 for(const p of FAMILY_PRESETS){
  const configuration=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),p.id);
  assert.ok(lowReadyArchetype(configuration),p.id);
 }
 assert.ok(LOW_READY_PASSES.standard.stockX<LOW_READY_PASSES.deep.stockX);
 assert.ok(LOW_READY_PASSES.compressed.centerPenalty<LOW_READY_PASSES.deep.centerPenalty);
});
