import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {muzzleAtShot,MUZZLE_TIP} from '../src/breach-muzzle.ts';
import {weaponGrips} from '../src/breach-weapon-pose.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
test('131: authoritative muzzle and visible barrel agree across weapons',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const weapon of ['carbine','smg','rifle','shotgun'])
  for(const aim of [.1,.45,.9,1]){
   const pose={x:100,z:200,heading:0,velocity:0,seconds:1,
     stride:0,posture:'stand',injury:0,weapon,
     reload:0,reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
     down:false,surrender:false,aiming:aim>.2,firing:false,turning:0,
     aimBlend:aim,shotHeading:0,recoil:0,deterministic:true};
   rig.root.position.set(100,0,200);
   poseOperator(rig,pose,0);
   rig.root.updateMatrixWorld(true);
   const tip=rig.weapon.localToWorld(new THREE.Vector3(
     MUZZLE_TIP,0,0));
   const shot=muzzleAtShot({x:100,z:200,heading:0,weaponYaw:0,
     aim,velocity:0,weapon,recoil:0});
   assert.ok(tip.distanceTo(new THREE.Vector3(
     shot.x,shot.y,shot.z))<.15,
     weapon+' aim '+aim+' mismatch: '+tip.distanceTo(
       new THREE.Vector3(shot.x,shot.y,shot.z)));
  }
 rig.dispose();
});
test('131: muzzle is distinct from shooter center and stable for replay',()=>{
 const p={x:50,z:80,heading:.8,weaponYaw:.8,
  weapon:'carbine',aim:1,velocity:0,recoil:0};
 const a=muzzleAtShot(p),b=muzzleAtShot({...p});
 assert.deepEqual(a,b);
 assert.ok(Math.hypot(a.x-p.x,a.z-p.z)>10);
});
