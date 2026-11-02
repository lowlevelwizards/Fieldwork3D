import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {canonicalRootOrientation,OPERATOR_FORWARD,
 LEGACY_FRAME_YAW} from '../src/operator-axis-convention.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const P=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const pose=(heading,extra={})=>({
 x:36,z:91,heading,velocity:0,seconds:1,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,aiming:false,
 firing:false,turning:0,deterministic:true,equipment:initialEquipmentLoadout(),...extra
});
const close=(got,expected,label)=>assert.ok(got.distanceTo(expected)<1e-5,
 label+': '+got.toArray()+' vs '+expected.toArray());
test('new root faces canonical -Z and old head, foot and weapon world positions are invariant',()=>{
 const rig=createOperatorRig('rook','blue');
 assert.equal(rig.root.children.includes(rig.legacyFrame),true);
 assert.equal(rig.hip.parent,rig.legacyFrame);
 assert.equal(rig.chest.parent,rig.legacyFrame);
 assert.equal(rig.feet[0].shoe.parent,rig.legacyFrame);
 assert.equal(rig.headCanonicalFrame.parent,rig.head);
 assert.ok(Math.abs(rig.legacyFrame.rotation.y-LEGACY_FRAME_YAW)<1e-9);
 for(const heading of [0,Math.PI/2,Math.PI,-Math.PI/2,.81]){
  poseOperator(rig,pose(heading),0);
  rig.root.updateMatrixWorld(true);
  close(OPERATOR_FORWARD.clone().applyQuaternion(rig.root.quaternion),
    P(Math.cos(heading),0,Math.sin(heading)),'forward');
  const oldBody=new THREE.Quaternion().setFromEuler(
   new THREE.Euler(rig.legacyPitch,rig.legacyYaw,rig.legacyRoll,'XYZ'));
  assert.ok(rig.legacyFrame.getWorldQuaternion(new THREE.Quaternion())
   .angleTo(oldBody)<1e-5);
  const origin=rig.root.getWorldPosition(P());
  close(rig.head.getWorldPosition(P()),
   rig.head.position.clone().add(rig.chest.position)
   .applyQuaternion(oldBody).add(origin),'head');
  close(rig.feet[0].shoe.getWorldPosition(P()),
   rig.feet[0].shoe.position.clone().applyQuaternion(oldBody).add(origin),'foot');
  close(rig.weapon.getWorldPosition(P()),
   rig.weapon.position.clone().applyQuaternion(rig.chest.quaternion)
    .add(rig.chest.position).applyQuaternion(oldBody).add(origin),'grip origin');
 }
 rig.dispose();
});
test('wounds, falls and flash reactions retain exact old orientation, not just yaw',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const changes of [
  {injury:2,hitYaw:1.4,hitRegion:'torso',hitAge:.25,hitSeverity:1},
  {down:true,downProgress:.5,downPose:'left'},
  {flashActive:true,seconds:2}
 ]){
  poseOperator(rig,pose(.7,changes),0);
  rig.root.updateMatrixWorld(true);
  const legacy=new THREE.Quaternion().setFromEuler(
   new THREE.Euler(rig.legacyPitch,rig.legacyYaw,rig.legacyRoll,'XYZ'));
  assert.ok(rig.legacyFrame.getWorldQuaternion(new THREE.Quaternion())
   .angleTo(legacy)<1e-5);
  assert.ok(rig.root.quaternion.angleTo(canonicalRootOrientation(
   rig.legacyPitch,rig.legacyYaw,rig.legacyRoll))<1e-5);
 }
 rig.dispose();
});
test('deterministic replay seek is not affected by a preceding pose',()=>{
 const rig=createOperatorRig('rook','blue');
 poseOperator(rig,pose(2.6),0);
 poseOperator(rig,pose(-.35,{seconds:.2}),0);
 const first=rig.head.getWorldPosition(P());
 const q=rig.legacyFrame.getWorldQuaternion(new THREE.Quaternion());
 poseOperator(rig,pose(1.3,{seconds:4}),0);
 poseOperator(rig,pose(-.35,{seconds:.2}),0);
 close(rig.head.getWorldPosition(P()),first,'seek head');
 assert.ok(rig.legacyFrame.getWorldQuaternion(new THREE.Quaternion()).angleTo(q)<1e-5);
 rig.dispose();
});
