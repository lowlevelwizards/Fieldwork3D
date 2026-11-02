import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 OPERATOR_FORWARD,OPERATOR_RIGHT,LEGACY_FRAME_YAW,
 canonicalRootOrientation,legacyYawFromHeading,
 createCanonicalAttachment,legacyPointToCanonical,canonicalPointToLegacy
} from '../src/operator-axis-convention.ts';
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
test('canonical forward/right coordinate axes are internally consistent',()=>{
 assert.deepEqual(OPERATOR_FORWARD.toArray(),[0,0,-1]);
 assert.deepEqual(OPERATOR_RIGHT.toArray(),[1,0,0]);
 const parent=new THREE.Group(),frame=createCanonicalAttachment(parent);
 assert.ok(v(0,0,-1).applyQuaternion(frame.quaternion).distanceTo(v(1,0,0))<1e-9);
 const sample=v(3,7,-8);
 assert.ok(canonicalPointToLegacy(legacyPointToCanonical(sample)).distanceTo(sample)<1e-9);
});
test('axis adapter preserves exact legacy world orientation at every heading and tilt',()=>{
 for(const heading of [0,Math.PI/2,-Math.PI/2,Math.PI,.71]){
  for(const pitch of [0,.18,-.42])for(const roll of [0,.25,-.16]){
   const legacy=new THREE.Quaternion().setFromEuler(
    new THREE.Euler(pitch,legacyYawFromHeading(heading),roll,'XYZ'));
   const outer=canonicalRootOrientation(pitch,legacyYawFromHeading(heading),roll);
   const frame=new THREE.Quaternion().setFromAxisAngle(v(0,1,0),LEGACY_FRAME_YAW);
   assert.ok(outer.clone().multiply(frame).angleTo(legacy)<1e-6,
    'must preserve legacy pose including injury/down rotations');
  }
 }
});
test('canonical local forward projects to the same world map heading',()=>{
 for(const h of [0,.4,Math.PI/2,-1.5,Math.PI]){
  const facing=OPERATOR_FORWARD.clone().applyQuaternion(
   canonicalRootOrientation(0,legacyYawFromHeading(h),0));
  assert.ok(facing.distanceTo(v(Math.cos(h),0,Math.sin(h)))<1e-9);
 }
});
