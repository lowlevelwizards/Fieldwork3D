import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {neutralMannequinHipRise,neutralMannequinWrist,
 neutralMannequinElbowPole,NEUTRAL_MANNEQUIN_HIP_RISE}
 from '../src/operator-mannequin-pose.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
const pose=(unarmedPreview,velocity=0)=>({
 x:0,z:0,heading:0,velocity,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,
 reloadDuration:0,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,
 turning:0,deterministic:true,unarmedPreview,
 equipment:bareLabEquipment()
});
test('mannequin relaxation applies only to unarmed stationary stand',()=>{
 assert.equal(neutralMannequinHipRise(0,'stand',false,false),NEUTRAL_MANNEQUIN_HIP_RISE);
 assert.equal(neutralMannequinHipRise(13,'stand',false,false),0);
 assert.equal(neutralMannequinHipRise(0,'crouch',false,false),0);
 assert.equal(neutralMannequinHipRise(0,'stand',true,false),0);
 assert.equal(neutralMannequinHipRise(0,'stand',false,true),0);
 const rig=createOperatorRig('rook','blue');
 poseOperator(rig,pose(false),0);
 const originalHip=rig.hip.position.y;
 const shoes=rig.feet.map(f=>f.shoe.position.clone());
 poseOperator(rig,pose(true),0);
 assert.ok(rig.hip.position.y>originalHip+2);
 rig.feet.forEach((f,i)=>assert.ok(f.shoe.position.distanceTo(shoes[i])<1e-6,
  'bare mannequin should not relocate authoritative shoe anchors'));
 poseOperator(rig,pose(true,18),0);
 assert.ok(rig.hip.position.y<originalHip+1,'moving stance recovers normal balance');
 rig.dispose();
});
test('both free hands rest near straight below their shoulders; elbow poles are outward and back',()=>{
 for(const side of [-1,1]){
  const wrist=neutralMannequinWrist(side);
  const shoulder=new THREE.Vector3(1,4,side*7);
  const pole=neutralMannequinElbowPole(side);
  assert.ok(wrist.distanceTo(shoulder)>18.5);
  assert.ok(wrist.distanceTo(shoulder)<19.8);
  assert.ok(pole.x<0,'elbow bends backward rather than through chest');
  assert.ok(side*pole.z>0,'elbow bends outward');
  assert.ok(wrist.y<-14,'hands naturally fall down along the thighs');
 }
});
