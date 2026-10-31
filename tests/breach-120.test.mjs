import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {solveTwoBone,alignSegment,bendDirection,ARM_LIMITS,LEG_LIMITS,
  intersectsTorso} from '../src/breach-ik.ts';
import {fitWeaponPose,weaponGrips} from '../src/breach-weapon-pose.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';

const near=(a,b,t=.0001)=>Math.abs(a-b)<t;
const v=(x,y,z)=>new THREE.Vector3(x,y,z);
function verifyLimb(result,start,upper,lower,limits){
  assert.ok(Number.isFinite(result.joint.x)&&Number.isFinite(result.joint.y)&&
    Number.isFinite(result.joint.z));
  assert.ok(near(result.joint.distanceTo(start),upper,.00001));
  assert.ok(near(result.joint.distanceTo(result.effector),lower,.00001));
  assert.ok(result.angle>=limits.minBend-1e-5);
  assert.ok(result.angle<=limits.maxBend+1e-5);
}
test('120: arms and knees retain bone lengths and anatomical bend limits',()=>{
  for(const limits of [ARM_LIMITS,LEG_LIMITS])
    for(const length of [0,1,2,8,12,18,20,60]){
      const start=v(1,18,6),end=v(length,1,4);
      const sol=solveTwoBone(start,end,10,10,v(4,-1,2),limits);
      verifyLimb(sol,start,10,10,limits);
      assert.equal(sol.reached,end.distanceTo(start)<
        Math.sqrt(200+200*Math.cos(limits.minBend))+.00001 &&
        end.distanceTo(start)>
        Math.sqrt(200+200*Math.cos(limits.maxBend))-.00001);
    }
});
test('120: degenerate and near-straight poles have stable bend planes',()=>{
  const start=v(0,20,0),pole=v(4,0,-1.2);
  let prior;
  for(let i=0;i<220;i++){
    const t=i/219,angle=(t-.5)*Math.PI*1.98;
    const end=v(Math.sin(angle)*.03,1.0,Math.cos(angle)*.02);
    const sol=solveTwoBone(start,end,10,10,pole,LEG_LIMITS,prior);
    assert.ok(sol.bendPlane.dot(pole)>0.2,
      'pole should not flip under a near-straight knee');
    if(prior)assert.ok(prior.dot(sol.bendPlane)>.75);
    prior=sol.bendPlane;
  }
  const parallel=bendDirection(v(0,1,0),v(0,1,0));
  assert.ok(near(parallel.length(),1));
});
test('120: box limb orientation does not roll around its long axis',()=>{
  const segment=new THREE.Object3D(),start=v(0,17,-6);
  const ref=v(0,0,-1);
  let last=null;
  for(let i=0;i<160;i++){
    const t=i/159;
    const end=v(Math.sin(t*2*Math.PI)*1.5,-1,
      -6+Math.cos(t*2*Math.PI)*.5);
    alignSegment(segment,start,end,ref);
    const x=v(1,0,0).applyQuaternion(segment.quaternion);
    const y=v(0,1,0).applyQuaternion(segment.quaternion);
    assert.ok(near(segment.scale.y,end.distanceTo(start),1e-5));
    assert.ok(near(x.dot(y),0));
    if(last)assert.ok(last.dot(x)>.95,
      'limb frame must not perform an arbitrary half-turn roll');
    last=x;
  }
});
test('120: a gun is rigid; stock, firing hand and support grip derive from it',()=>{
  for(const weapon of ['carbine','smg','rifle','shotgun']){
    for(const handling of ['low','high','point','ads','short']){
      for(const yaw of [-1.3,-.5,0,.6,1.3]){
        const fit=fitWeaponPose({weapon,handling,yaw,recoil:.4});
        assert.ok(fit.rotation.y<=1.12&&fit.rotation.y>=-1.12);
        assert.ok(Number.isFinite(fit.origin.x));
        // Stock error now measures the actual anatomical shoulder separation;
        // high-yaw/recoil previews may legitimately show a large offset.
        // Assert it is finite here; exact metric is covered in Build 160.
        assert.ok(Number.isFinite(fit.stockError));
        if(fit.twoHanded){
          assert.ok(fit.primary.distanceTo(v(1,4,7))<=19.92001);
          assert.ok(fit.support.distanceTo(v(1,4,-7))<=19.92001);
        }
        if(fit.primaryReachable)
          assert.ok(fit.primary.distanceTo(v(1,4,7))<=19.92001);
      }
    }
  }
});

test('120: fitted contacts exactly equal points on a rigid transformed gun',()=>{
  for(const weapon of ['carbine','smg','rifle','shotgun'])
    for(const handling of ['low','high','point','ads','short'])
      for(const yaw of [-1.1,-.45,0,.55,1.1]){
        const fit=fitWeaponPose({weapon,handling,yaw,recoil:1.2});
        const data=weaponGrips(weapon);
        const project=(x,y,z)=>v(x*data.lengthScale,y,z)
          .applyEuler(fit.rotation).add(fit.origin);
        assert.ok(fit.stock.distanceTo(project(data.stockX,0,0))<1e-6);
        assert.ok(fit.primary.distanceTo(project(
          data.primaryX,data.primaryY,1.8))<1e-6);
        assert.ok(fit.support.distanceTo(project(
          data.supportX,data.supportY,-1.6))<1e-6);
      }
});

const makePose=(seconds,x,z,heading,extra={})=>({
  x,z,heading,seconds,velocity:38,stride:seconds*40,
  posture:'stand',injury:0,weapon:'carbine',
  reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
  down:false,surrender:false,aiming:true,firing:false,turning:0,
  aimBlend:1,shotHeading:heading,travelYaw:heading,...extra
});
test('120: continuous movement and turn keep anatomical joints finite',()=>{
  const rig=createOperatorRig('rook','blue');
  for(let n=0;n<240;n++){
    const t=n/60,heading=Math.min(1,t/2)*Math.PI;
    const x=30*Math.sin(heading),z=25*(1-Math.cos(heading));
    rig.root.position.set(x,0,z);
    poseOperator(rig,makePose(t,x,z,heading,{velocity:t>3?0:28,
      injury:t>2.2?2:0}),1/60);
    rig.root.updateMatrixWorld(true);
    for(let i=0;i<2;i++){
      const foot=rig.feet[i],arm=rig.arms[i];
      for(const node of [foot.upper,foot.lower,foot.shoe,
        arm.upper,arm.lower,arm.hand]){
        for(const a of [...node.position.toArray(),...node.quaternion.toArray()])
          assert.ok(Number.isFinite(a));
      }
      const shin=foot.lower.scale.y,thigh=foot.upper.scale.y;
      const upperArm=arm.upper.scale.y,forearm=arm.lower.scale.y;
      assert.ok(near(shin,9.7,.0001)&&near(thigh,9.7,.0001));
      assert.ok(near(upperArm,10,.0001)&&near(forearm,10,.0001));
    }
  }
  rig.dispose();
});
test('120: door interaction outside reach exposes a reposition request',()=>{
  const rig=createOperatorRig('rook','blue'),time=2;
  rig.root.position.set(0,0,0);
  poseOperator(rig,makePose(time,0,0,0,{
    velocity:0,lastDoorAt:time,doorPoint:{x:250,y:190}}),1/60);
  assert.equal(rig.reachRequest?.kind,'door');
  assert.ok(rig.reachRequest.distance>19.92);
  assert.ok(rig.arms[0].outOfReach);
  rig.dispose();
});
test('120: scene does not compete with anatomical and firearm transforms',()=>{
  const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  assert.doesNotMatch(source,/object\.legs\[0\]\.rotation/);
  assert.doesNotMatch(source,/object\.weapon\.rotation/);
  assert.doesNotMatch(source,/object\.root\.rotation/);
  assert.ok(source.includes('poseOperator(object.physical,'));
  assert.equal(typeof intersectsTorso,'function');
});
