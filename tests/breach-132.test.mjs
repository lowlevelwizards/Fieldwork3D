import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {chooseFall,fallAngles,hitRegion,hitStagger}
  from '../src/breach-wounds.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {LabMotionCache} from '../src/breach-lab-tracks.ts';
test('132: wound and collapse outcomes are deterministic and directional',()=>{
 for(let id=1;id<100;id++)assert.equal(hitRegion(id),hitRegion(id));
 assert.equal(chooseFall(0,0),'forward');
 assert.equal(chooseFall(0,Math.PI),'back');
 assert.equal(chooseFall(0,Math.PI/2),'right');
 assert.equal(chooseFall(0,-Math.PI/2),'left');
 assert.equal(chooseFall(0,Math.PI,true),'slump');
 for(const pose of ['forward','back','left','right']){
  const angles=fallAngles(pose,1);
  assert.ok(Math.hypot(angles.x,angles.z)>1.4,pose+' still upright');
  assert.ok(angles.y>=3.8);
 }
 assert.ok(Math.abs(fallAngles('forward',0).x)<1e-9);
 const stagger=hitStagger('leg',Math.PI/2,0,.18,2);
 assert.ok(stagger.side>.1&&stagger.brace>0);
});
test('132: incapacitation places torso on floor and settles on repeat seek',()=>{
 const rig=createOperatorRig('rook','blue');
 const baseline={x:0,z:0,heading:0,velocity:0,seconds:2,
  stride:0,posture:'stand',injury:3,weapon:'carbine',
  reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
  down:true,surrender:false,aiming:false,firing:false,turning:0,
  hitAge:.8,hitRegion:'torso',hitYaw:Math.PI,hitSeverity:2,
  deterministic:true,downProgress:1};
 for(const downPose of ['forward','back','left','right']){
  poseOperator(rig,{...baseline,downPose},0);
  rig.root.updateMatrixWorld(true);
  const chest=rig.chest.getWorldPosition(new THREE.Vector3());
  assert.ok(chest.y<9,'torso hovering '+downPose+' at '+chest.y);
  const prior=[rig.root.rotation.x,rig.root.rotation.z,chest.y];
  poseOperator(rig,{...baseline,downPose},0);
  rig.root.updateMatrixWorld(true);
  const after=rig.chest.getWorldPosition(new THREE.Vector3());
  assert.deepEqual([rig.root.rotation.x,rig.root.rotation.z,after.y],prior);
 }
 poseOperator(rig,{...baseline,downPose:'slump'},0);
 assert.ok(Math.abs(rig.root.rotation.x)<1.0);
 rig.dispose();
});
test('132: lab fall tracks reconstruct without dependent frame history',()=>{
 for(const kind of ['down-forward','down-back','down-left',
   'down-right','down-slump']){
  const cache=new LabMotionCache(kind);
  assert.equal(cache.sample(.2).motion.down,false);
  assert.equal(cache.sample(1.2).motion.down,true);
  const sample=cache.sample(1.75);
  cache.sample(3.5);cache.sample(.05);cache.sample(1.75);
  assert.deepEqual(cache.sample(1.75),sample);
 }
});
