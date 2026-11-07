import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {fitWeaponPose} from '../src/breach-weapon-pose.ts';
import {interpolateWeaponCarry} from '../src/breach-low-ready-transition.ts';
const text=(file)=>readFileSync(new URL(file,import.meta.url),'utf8');

test('Lab snapshots the rendered stance and does not re-enter generic mid-transition fit',()=>{
 const lab=text('../src/breach-operator-lab.ts');
 const rig=text('../src/breach-operator-rig.ts');
 assert.match(lab,/rig\.root\.userData\.presentedWeaponFit/);
 assert.match(lab,/authoredFrom:presented\?/);
 assert.match(lab,/authoredArms:presented\?/);
 assert.match(rig,/\(!activeTransition\|\|authoredLabSwitch\)/);
 assert.match(rig,/blendFrom:authoredLabSwitch\?undefined/);
 assert.match(rig,/fit=interpolateWeaponCarry\(activeTransition\.authoredFrom,fit,phase\)/);
 assert.match(rig,/if\(sourceArm&&activeTransition!\.alpha<=0\)/);
});
test('authored weapon interpolation has exact source and destination endpoints',()=>{
 const a=fitWeaponPose({weapon:'carbine',handling:'ready',yaw:0,recoil:0});
 const b=fitWeaponPose({weapon:'carbine',handling:'low',yaw:0,recoil:0});
 assert.deepEqual(interpolateWeaponCarry(a,b,0).origin.toArray(),a.origin.toArray());
 assert.deepEqual(interpolateWeaponCarry(a,b,1).origin.toArray(),b.origin.toArray());
 const mid=interpolateWeaponCarry(a,b,.5);
 for(const p of [mid.origin,mid.stock,mid.primary,mid.support])
  assert.ok(p.toArray().every(Number.isFinite));
 assert.ok(new THREE.Quaternion().setFromEuler(mid.rotation).length()>0.99);
});
