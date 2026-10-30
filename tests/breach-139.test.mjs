import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {handlingInstability} from '../src/breach-ballistics.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
test('139: turn/recoil and travel increase physically visible dispersion',()=>{
 const steady=handlingInstability(0,0,0,1);
 assert.equal(steady,0);
 assert.ok(handlingInstability(2,0,.2,.4)>handlingInstability(0,0,.2,.4));
 assert.ok(handlingInstability(0,60,.4,.4)>handlingInstability(0,0,0,1));
});
test('139: falling operator releases grip and a separate gun settles to ground',()=>{
 const r=createOperatorRig('rook','blue');
 const p={x:40,z:50,heading:0,velocity:0,seconds:2,stride:0,
  posture:'stand',injury:3,weapon:'carbine',reload:0,reloadDuration:1,
  lastThrowAt:-100,lastDoorAt:-100,down:true,surrender:false,aiming:false,
  firing:false,turning:0,downPose:'left',downProgress:1,deterministic:true};
 poseOperator(r,p,0);
 assert.equal(r.weapon.visible,false);
 assert.equal(r.droppedGun.visible,true);
 r.root.updateMatrixWorld(true);
 const first=r.droppedGun.getWorldPosition(new THREE.Vector3());
 assert.ok(first.y>0&&first.y<5);
 poseOperator(r,p,0);r.root.updateMatrixWorld(true);
 const next=r.droppedGun.getWorldPosition(new THREE.Vector3());
 assert.ok(first.distanceTo(next)<.001);
 r.dispose();
});
test('139: 3D shot effects are not redrawn through foreground UI overlay',()=>{
 const c=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const start=c.indexOf('function renderProjectedPlans()'),end=c.indexOf('function fog()',start);
 assert.ok(start>0&&end>start);
 assert.doesNotMatch(c.slice(start,end),/for\\(const shot of state\\.shots\\)/);
});
