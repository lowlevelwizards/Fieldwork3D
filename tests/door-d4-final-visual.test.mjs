import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {resolveOperatorActionState} from '../src/breach-pose-action-state.ts';
import {doorGripWeight} from '../src/breach-pose-door-hand.ts';
import {snapshot} from '../src/breach-replay.ts';
import {newSession,team} from '../src/breach-game.ts';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
import {activateSite} from '../src/breach-core.ts';

const base={x:0,z:0,heading:0,travelYaw:0,velocity:0,
 seconds:2.4,stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,
 poseV3Preview:true,poseV4ReloadPreview:true,
 poseDiagnostics:false,deterministic:true,
 aimBlend:0,shotHeading:0,handlingOverride:'low'};
const handPos=rig=>{
 rig.root.updateMatrixWorld(true);
 return rig.arms[0].hand.getWorldPosition(new THREE.Vector3());
};
const rightPos=rig=>{
 rig.root.updateMatrixWorld(true);
 return rig.arms[1].hand.getWorldPosition(new THREE.Vector3());
};
const weaponPos=rig=>{
 rig.root.updateMatrixWorld(true);
 return rig.weapon.getWorldPosition(new THREE.Vector3());
};
test('D4 sustained grip follows changing physical contact without moving firearm',()=>{
 const left=createOperatorRig('d4-left','blue',true),
 right=createOperatorRig('d4-right','blue',true);
 const contact=(point)=>({point,startedAt:2,releasedAt:null,mode:'handle'});
 try{
  const a={...base,doorGrip:contact({x:16,y:-10})};
  const b={...base,doorGrip:contact({x:12,y:-16})};
  poseOperator(left,a,0);
  poseOperator(right,b,0);
  const old=handPos(left),next=handPos(right);
  assert.ok(old.distanceTo(next)>2,
   'left wrist must track the moving physical contact, not a timed gesture');
  assert.ok(old.distanceTo(next)<16,'no elbow teleport through wall');
  assert.ok(rightPos(left).distanceTo(rightPos(right))<.001,
   'right firing hand must stay on the same rigid weapon');
  assert.ok(weaponPos(left).distanceTo(weaponPos(right))<.001,
   'door animation must not move the firearm/shot model');
  for(const rig of [left,right]){
   for(const arm of rig.arms){
    assert.ok(arm.hand.position.toArray().every(Number.isFinite));
    assert.ok(Math.abs(arm.upper.scale.y-10)<1e-6);
    assert.ok(Math.abs(arm.lower.scale.y-10)<1e-6);
   }
  }
 }finally{left.dispose();right.dispose();}
});
test('D4 replay seek and hand-release restore deterministic support pose',()=>{
 const rig=createOperatorRig('d4-seek','blue',true);
 const contact={point:{x:15,y:-10},mode:'handle',
  startedAt:2,releasedAt:null};
 const pose={...base,doorGrip:contact};
 try{
  poseOperator(rig,pose,0);
  const first=handPos(rig);
  poseOperator(rig,{...pose,seconds:8,doorGrip:null},0);
  poseOperator(rig,pose,-1);
  assert.ok(first.distanceTo(handPos(rig))<1e-5);
  const release={...contact,releasedAt:2.5};
  poseOperator(rig,{...pose,seconds:2.60,doorGrip:release},0);
  const released=handPos(rig);
  poseOperator(rig,{...pose,seconds:2.74,doorGrip:release},0);
  const returned=handPos(rig);
  assert.ok(released.distanceTo(returned)>.01,
   'real release should ease toward the support grip');
  assert.equal(doorGripWeight(release,2.74),0);
 }finally{rig.dispose();}
});
test('D4 left support hand owner yields to reload, treatment, throw, death',()=>{
 const contact={point:{x:16,y:-10},mode:'panel',
  startedAt:2,releasedAt:null};
 const action=(extra)=>resolveOperatorActionState(
  {...base,doorGrip:contact,...extra},0,false);
 assert.equal(action({}).handOwners.left,'door');
 assert.equal(action({reload:.9}).handOwners.left,'magazine');
 assert.equal(action({treatmentActive:true}).handOwners.left,'medical');
 assert.equal(action({lastThrowAt:2.2}).handOwners.left,'throw');
 assert.equal(action({down:true}).handOwners.left,'weapon');
});
test('D4 replay snapshots copy grip position (old films may omit it)',()=>{
 const s=newSession(0,undefined,'full-view','small','hold',
  doorRangeSite('ajar-outward'),{enableCivilians:false});
 try{
  const actor=team(s)[0];
  const c={doorId:'ENTRY',fraction:.82,mode:'handle',
   startedAt:3.2,releasedAt:null,point:{x:307,y:242}};
  actor.doorGrip=c;
  const frame=snapshot(s);
  const recorded=frame.actors.find(a=>a.id===actor.id);
  assert.deepEqual(recorded.doorGrip,c);
  c.point.x=999;
  assert.equal(recorded.doorGrip.point.x,307,
   'a replay seek cannot see a later mutable door contact');
  assert.equal(recorded.doorGrip.releasedAt,null);
  const oldFilm={...recorded};
  delete oldFilm.doorGrip;
  assert.equal(oldFilm.doorGrip,undefined);
 }finally{activateSite(null);}
});
