import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {
 WORKBENCH_TARGETS,captureWorkbenchPose,cloneWorkbenchPose,
 applyWorkbenchPose,weaponWorkbenchContacts,snapWorkbenchHandsToGun,
 interpolateWorkbenchPose,readWorkbenchPose
} from '../src/operator-pose-workbench.ts';

const configuration=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const setReady=(rig,weapon='carbine',config=configuration)=>{
 poseOperator(rig,{
  x:0,z:0,heading:0,travelYaw:0,velocity:0,seconds:1,
  stride:0,posture:'stand',injury:0,weapon,
  weaponConfiguration:config,reload:0,reloadDuration:1.8,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,handlingOverride:'ready',
  deterministic:true,poseV3Preview:false,poseV4ReloadPreview:false
 },0);
};
test('workbench captures seven ACTUAL rig targets, not synthetic IK guesses',()=>{
 const rig=createOperatorRig('workbench-capture','blue');
 try{
  setReady(rig);
  const p=captureWorkbenchPose(rig,'carbine','ar-m4a1',configuration);
  assert.equal(p.version,1);
  assert.deepEqual(Object.keys(p.targets),WORKBENCH_TARGETS);
  for(const key of WORKBENCH_TARGETS){
   assert.equal(p.targets[key].length,3);
   assert.ok(p.targets[key].every(Number.isFinite),key);
  }
  const work=applyWorkbenchPose(rig,p,configuration);
  assert.ok(work.maxReachError<.2,
    'capturing a physically solved ready rig should not stretch arms');
  // Existing auto-ready can itself be offset from a real gun socket.
  // The editor must REPORT that original mismatch, not fake a grip fit.
  const contacts=weaponWorkbenchContacts(p,configuration);
  assert.ok(Math.abs(work.support.gripGap-
    new THREE.Vector3(...work.support.hand).distanceTo(contacts.support))<1e-6);
  assert.ok(Math.abs(work.firing.gripGap-
    new THREE.Vector3(...work.firing.hand).distanceTo(contacts.firing))<1e-6);
  assert.ok(new THREE.Vector3(...p.targets.stock).distanceTo(
   new THREE.Vector3(...work.stock))<1e-6);
 }finally{rig.dispose();}
});
test('stock handle translates the actual firearm, never the operator legs',()=>{
 const rig=createOperatorRig('workbench-stock','blue');
 try{
  setReady(rig);
  const p=captureWorkbenchPose(rig,'carbine','ar-m4a1',configuration);
  const footBefore=rig.feet.map(f=>f.shoe.position.clone());
  const gunBefore=rig.weapon.position.clone();
  p.targets.stock[0]-=4.25;p.targets.stock[1]-=2.75;
  snapWorkbenchHandsToGun(p,configuration);
  const report=applyWorkbenchPose(rig,p,configuration);
  assert.ok(Math.abs(rig.weapon.position.x-(gunBefore.x-4.25))<1e-6);
  assert.ok(Math.abs(rig.weapon.position.y-(gunBefore.y-2.75))<1e-6);
  const gun=weaponWorkbenchContacts(p,configuration);
  assert.deepEqual(p.targets.supportHand,gun.support.toArray());
  assert.deepEqual(p.targets.firingHand,gun.firing.toArray());
  // If the gun is too far away, the fixed-length IK must report its
  // unsatisfied wrist gap rather than stretch the forearm to fake contact.
  assert.ok(Math.abs(report.support.gripGap-report.support.wristGap)<1e-5);
  assert.ok(Math.abs(report.firing.gripGap-report.firing.wristGap)<1e-5);
  for(let i=0;i<2;i++)
   assert.ok(rig.feet[i].shoe.position.distanceTo(footBefore[i])<1e-6);
 }finally{rig.dispose();}
});
test('author elbows are bend guides, not independent stretchable mesh joints',()=>{
 const rig=createOperatorRig('workbench-arms','blue');
 try{
  setReady(rig);
  const p=captureWorkbenchPose(rig,'carbine','ar-m4a1',configuration);
  p.targets.firingElbow=[20,-13,19];
  p.targets.supportElbow=[14,-8,-19];
  p.targets.firingHand=[15,-4,9];
  const result=applyWorkbenchPose(rig,p,configuration);
  assert.ok(result.firing.elbowGuideGap>0);
  for(const arm of rig.arms){
   assert.ok(Math.abs(arm.upper.scale.y-10)<1e-5);
   assert.ok(Math.abs(arm.lower.scale.y-10)<1e-5);
  }
  assert.ok(Number.isFinite(result.maxReachError));
 }finally{rig.dispose();}
});
test('saved recipe is finite, editable, versioned and reversibly imported',()=>{
 const rig=createOperatorRig('workbench-json','blue');
 try{
  setReady(rig);
  const start=captureWorkbenchPose(rig,'carbine','ar-m4a1',configuration);
  const target=cloneWorkbenchPose(start);
  target.targets.stock[0]-=8;
  target.targets.stock[1]-=7;
  target.targets.stock[2]+=3;
  target.torso[1]=12;
  target.weaponRotation[2]=-18;
  const json=JSON.stringify(target);
  assert.deepEqual(readWorkbenchPose(json),target);
  for(const t of [0,.1,.35,.5,.7,.9,1]){
   const p=interpolateWorkbenchPose(start,target,t);
   const report=applyWorkbenchPose(rig,p,configuration);
   assert.ok(Number.isFinite(report.maxReachError));
   assert.ok(p.targets.stock[0]<=start.targets.stock[0]+1e-5);
   assert.ok(p.targets.stock[0]>=target.targets.stock[0]-1e-5);
  }
  assert.deepEqual(interpolateWorkbenchPose(start,target,0),start);
  assert.deepEqual(interpolateWorkbenchPose(start,target,1),target);
  assert.throws(()=>readWorkbenchPose('{"version":2}'),/Unsupported/);
  assert.throws(()=>readWorkbenchPose(JSON.stringify({
   ...target,targets:{...target.targets,stock:[Infinity,0,0]}
  })),/Invalid stock/);
 }finally{rig.dispose();}
});
test('workbench is a separate production-built page with discoverable entry',()=>{
 const html=readFileSync(new URL('../pose-workbench.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../src/operator-pose-workbench-ui.ts',import.meta.url),'utf8');
 assert.match(vite,/poseWorkbench: 'pose-workbench.html'/);
 assert.match(lab,/href=".\/pose-workbench.html"/);
 for(const id of ['wbTargets','xyzControls','wbFollow','wbSnap',
  'wbCopy','wbImport','wbExport','wbSave','wbLoad','blend']){
  assert.match(html,new RegExp('id="'+id+'"'),id);
 }
 assert.match(ui,/raycaster\.intersectObjects/);
 assert.match(ui,/slider\.type='range'/); // continuous XYZ sliders
 assert.match(ui,/snapWorkbenchHandsToGun/);
 assert.doesNotMatch(ui,/carryElbowViolation|solveUnifiedFallbackArm|weaponClearance/);
});
