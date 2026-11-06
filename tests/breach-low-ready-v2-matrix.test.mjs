import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {poseClearanceEnvelope} from '../src/breach-pose-clearance-envelope.ts';
import {solveCoupledLowReady} from '../src/breach-coupled-low-ready.ts';
import {assessLowReadyPair} from '../src/breach-low-ready-anatomy.ts';
import {ANATOMY} from '../src/breach-anatomy.ts';
const shoulders=[new THREE.Vector3(1,4,-7),new THREE.Vector3(1,4,7)];
// Authored modular low-ready now uses the normal physical shoulder joints
// across both gameplay and explicit Studio preview (not shifted lab-only).
const studioShoulders=[
 new THREE.Vector3(ANATOMY.shoulderLeft.x,
  ANATOMY.shoulderLeft.y,ANATOMY.shoulderLeft.z),
 new THREE.Vector3(ANATOMY.shoulderRight.x,
  ANATOMY.shoulderRight.y,ANATOMY.shoulderRight.z)
];
const fixtures=[
 ['ar-m4a1','plate-slick','full-chest','smock-jacket'],
 ['ar-m4a1','soft-flak','full-chest','smock-jacket'],
 ['ar-m4a1','plate-legacy','full-chest','smock-jacket'],
 ['ar-m4a1','plate-heavy','full-chest','smock-jacket'],
 ['ak-aks74u','plate-slick','full-chest','smock-jacket'],
 ['ak-aks74u','soft-flak','full-chest','smock-jacket'],
 ['ak-rpk74','soft-flak','full-chest','smock-jacket'],
 ['ak-akm','plate-legacy','full-chest','smock-jacket']
];
test('eight difficult loadouts prefer valid physical two-handed ready',()=>{
 let twoHanded=0;const failed=[];
 for(const [id,armor,rig,top] of fixtures){
  const preset=FAMILY_PRESETS.find(p=>p.id===id);
  assert.ok(preset,'Missing authored weapon: '+id);
  const cfg=selectWeaponFamilyPreset(
   initialWeaponConfiguration(preset.weapon),id);
  const solution=solveCoupledLowReady({weapon:preset.weapon,
   configuration:cfg,shoulders,
   armor:poseClearanceEnvelope(armor,rig,top),nominalYaw:0,
   onDiagnostics:stats=>console.log('POSE-V2-REJECTIONS',id,armor,JSON.stringify(stats))});
  const mode=solution?.mode??'unresolved';
  const elbows=solution?.arms.map((arm,i)=>({
   drop:Number((shoulders[i].y-arm.joint.y).toFixed(2)),
   flare:Number(((i===0?-1:1)*(arm.joint.z-shoulders[i].z)).toFixed(2)),
   forward:Number((arm.joint.x-shoulders[i].x).toFixed(2)),
   flex:Number((arm.angle*180/Math.PI).toFixed(1))
  }));
  console.log('POSE-V2',id,armor,rig,top,mode,
   'hard',solution?.penetration??'none',
   'soft',solution?.softContact??'none',
   'elbows',JSON.stringify(elbows),
   'stock',solution?.fit.stock.toArray().map(n=>n.toFixed(2)).join(',')??'N/A',
   'candidates',solution?.candidates??0);
  if(solution?.status!=='clear'||!solution.fit.twoHanded){
   failed.push(id+'/'+armor+': '+mode);
   continue;
  }
  twoHanded++;
  const anatomy=assessLowReadyPair(
   shoulders,[solution.arms[0].joint,solution.arms[1].joint],
   [solution.arms[0].effector,solution.arms[1].effector],
   [solution.arms[0].angle,solution.arms[1].angle]);
  assert.equal(anatomy.valid,true,id+'/'+armor);
  assert.ok(solution.penetration<=.12+1e-5,id+'/'+armor);
  assert.ok(solution.fit.stockError<=2.5,id+'/'+armor);
 }
 assert.equal(twoHanded,8,
  'All eight common armored kits must hold the rifle: '+failed.join('; '));
});

test('studio shoulder frame also passes all eight kits',()=>{
 let passed=0;const failed=[];
 for(const [id,armor,rig,top] of fixtures){
  const preset=FAMILY_PRESETS.find(p=>p.id===id);
  const cfg=selectWeaponFamilyPreset(
   initialWeaponConfiguration(preset.weapon),id);
  const s=solveCoupledLowReady({weapon:preset.weapon,configuration:cfg,
   shoulders:studioShoulders,
   armor:poseClearanceEnvelope(armor,rig,top),nominalYaw:0});
  console.log('POSE-V2-STUDIO',id,armor,s?.mode??'unresolved');
  if(s?.status==='clear'&&s.fit.twoHanded)passed++;
  else failed.push(id+'/'+armor+' '+(s?.mode??'unresolved'));
 }
 assert.equal(passed,8,'Real Studio shoulder profile: '+failed.join('; '));
});
