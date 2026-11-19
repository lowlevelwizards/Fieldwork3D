import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {LAB_TRACKS} from '../src/breach-lab-tracks.ts';
import {POSE_ANIMATIONS} from '../src/operator-lab-pose-browser.ts';
import {isLabContactTrack,labContactPose,labContactDescription}
 from '../src/operator-lab-contact-tracks.ts';
import {physicalContactWeight}
 from '../src/breach-physical-contact-anchor.ts';
import {createOperatorRig,poseOperator}
 from '../src/breach-operator-rig.ts';

const contactTracks=[
 'pre-open-handle','pre-open-hinge','pre-open-cancel',
 'stack-shoulder','stack-shoulder-crouch','stack-shoulder-cancel'];
test('A3.10 E: six interactive Poses tracks exist in the actual browser',()=>{
 for(const id of contactTracks){
  assert.ok(LAB_TRACKS.includes(id),id+' has a motion cache');
  assert.ok(POSE_ANIMATIONS.some(p=>p.id===id&&p.group==='INTERACTIONS'));
  assert.equal(isLabContactTrack(id),true);
  assert.ok(labContactDescription(id,1).length>15);
 }
 assert.equal(isLabContactTrack('reload'),false);
 assert.equal(labContactPose('reload',1),null);
});
test('A3.10 E: door targets follow visible practice door; releases rewind',()=>{
 const handle=labContactPose('pre-open-handle',1);
 const hinge=labContactPose('pre-open-hinge',1);
 assert.deepEqual(handle.anchor.point,{x:15.5,y:19,z:8});
 assert.deepEqual(hinge.anchor.point,{x:17.5,y:19,z:-6});
 assert.equal(handle.anchor.intent,undefined);
 assert.equal(handle.intent,'door');
 assert.equal(handle.releasedAt,null);
 assert.ok(physicalContactWeight(handle,1)>.98);
 const cancel=labContactPose('pre-open-cancel',2.6);
 assert.equal(cancel.releasedAt,2.25);
 assert.equal(physicalContactWeight(cancel,2.6),0);
 assert.equal(labContactPose('pre-open-cancel',1).releasedAt,null,
   'reverse seek creates no stored contact state');
});
test('A3.10 E: shoulder preview tracks use actual cap/crouch geometry',()=>{
 const high=labContactPose('stack-shoulder',1);
 const crouch=labContactPose('stack-shoulder-crouch',1);
 assert.equal(high.anchor.target,'teammate');
 assert.equal(high.anchor.id,'lab-lead');
 assert.ok(high.anchor.normal.y>.96,'upward-facing cap');
 assert.equal(high.anchor.point.y,33.5);
 assert.equal(crouch.anchor.point.y,25.5);
 assert.equal(labContactPose('stack-shoulder-cancel',3).releasedAt,2.25);
});
test('A3.10 E: support wrist tips onto shoulder cap, but weapon grip restores',()=>{
 const rig=createOperatorRig('lab-palm','blue',true);
 const base={x:0,z:0,heading:0,velocity:0,seconds:1,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1,
  lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  poseV3Preview:true,poseV4ReloadPreview:true,poseDiagnostics:false,
  handlingOverride:'high',handlingIntent:'stack'};
 try{
  poseOperator(rig,base,0);
  const free=rig.arms[0].hand.quaternion.clone();
  poseOperator(rig,{...base,physicalContact:labContactPose('stack-shoulder',1)},0);
  const on=rig.arms[0].hand.quaternion.clone();
  assert.ok(on.angleTo(free)>.14,
   'real wrist quaternion visibly rotates to rest on the cap');
  poseOperator(rig,{...base,seconds:3,physicalContact:
    labContactPose('stack-shoulder-cancel',3)},0);
  const released=rig.arms[0].hand.quaternion.clone();
  assert.ok(released.angleTo(free)<.05,'cancel restores normal hand angle');
  poseOperator(rig,{...base,physicalContact:labContactPose('stack-shoulder',1)},0);
  assert.ok(rig.arms[0].hand.quaternion.angleTo(on)<1e-4,
   'same film time reconstructs identical palm angle');
 }finally{rig.dispose();}
});
