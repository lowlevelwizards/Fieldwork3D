import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig} from '../src/breach-operator-rig.ts';
import {applyOperatorTraumaPose,finishOperatorPoseFrame} from '../src/breach-pose-frame-finalizer.ts';
test('post IK phase records only appearance and snapshot state',()=>{
 const rig=createOperatorRig('pose-phase','blue');
 const pose={seconds:2,posture:'stand',stride:0,down:false,
  unarmedPreview:true,surrender:false,flashActive:false};
 applyOperatorTraumaPose(rig,pose,0);
 finishOperatorPoseFrame(rig,pose);
 assert.equal(rig.weapon.visible,false);
 assert.equal(rig.lastTime,2);
 assert.equal(rig.lastPose?.seconds,2);
 rig.dispose();
});
