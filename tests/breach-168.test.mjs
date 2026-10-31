import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {stockPocket,elbowCorridor} from '../src/breach-anatomy.ts';
import {weaponGrips,fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {HANDLING_PROFILES} from '../src/breach-handling-profiles.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';

const modes=['high','low','ready','short','point','ads'];
test('168: every shoulder pocket is on the upper chest, not an outboard shelf',()=>{
 for(const mode of modes){
  const pocket=stockPocket(mode);
  assert.ok(pocket.z<=8.1,mode+' pocket is too far to the side');
  assert.ok(pocket.z>=7.25,mode+' pocket buried into the torso');
 }
 assert.ok(stockPocket('short').y<stockPocket('ready').y-5);
 assert.ok(stockPocket('short').z>stockPocket('ready').z+.35);
 assert.ok(stockPocket('short').z<8.2);
});
test('168: longer stock rear face is still physically exact at all weapon scales',()=>{
 for(const weapon of ['carbine','smg','rifle','shotgun']){
  const g=weaponGrips(weapon);
  assert.equal(g.stockX,-13.5);
  for(const mode of modes){
   const fit=fitWeaponPose({weapon,handling:mode,yaw:0,recoil:0});
   const rear=new THREE.Vector3(-13.5*g.lengthScale,0,0)
     .applyEuler(fit.rotation).add(fit.origin);
   assert.ok(rear.distanceTo(fit.stock)<1e-6,
     mode+' buttplate does not match visible rear');
   assert.ok(fit.stockError<3,mode+' stock loses contact');
   assert.ok(fit.stock.z>=7.25);
   assert.ok(Number.isFinite(fit.contactError));
  }
 }
});
test('168: elbow targets are intermediate, not chicken wings or rib-pinned',()=>{
 for(const mode of modes){
  for(const sign of [-1,1]){
   const p=elbowCorridor(mode,sign);
   assert.ok(Math.abs(p.z)>7.55&&Math.abs(p.z)<8.15,
     mode+' has implausible pole lateral spread');
  }
 }
 const r=createOperatorRig('rook','blue');
 for(const mode of modes){
  poseOperator(r,{x:0,z:0,heading:0,seconds:1,velocity:0,stride:0,
    posture:'stand',injury:0,weapon:'carbine',reload:0,
    reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
    down:false,surrender:false,aiming:mode==='ads',firing:false,
    turning:0,deterministic:true,handlingOverride:mode},0);
  assert.ok(r.elbowSpread.every(Number.isFinite));
  assert.ok(r.elbowSpread.every(d=>d<9),
   'IK elbow exceeded acceptable upper-body silhouette in '+mode);
 }
 r.dispose();
});
test('168: upper-body profiles keep six different intentions',()=>{
 const p=HANDLING_PROFILES;
 assert.ok(p.high.pitch>.4&&p.low.pitch<-.4);
 assert.ok(p.short.stockY<p.low.stockY-4);
 assert.ok(p.ads.headDrop>p.point.headDrop+.9);
 assert.ok(p.short.elbowTuck>p.high.elbowTuck);
 assert.ok(p.high.elbowTuck>p.ads.elbowTuck);
 assert.ok(p.ready.elbowTuck>p.point.elbowTuck);
});
