import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {sampleSuspensionMotion} from '../src/breach-weapon-suspension.ts';
import {sampleRetentionPose} from '../src/breach-weapon-retention-pose.ts';
const m={stride:.22,speed:55,acceleration:0,turning:0,massKg:3,inertia:120,gait:'walk'};
const magnitude=v=>Math.hypot(v.lift,v.sway,v.foreAft,v.separation);
test('SR12 suspension translates, lags and settles deterministically',()=>{
 const a=sampleSuspensionMotion('single',m),b=sampleSuspensionMotion('two',m);
 assert.ok(magnitude(a)>.2&&magnitude(a)>magnitude(b)*2);
 assert.ok(magnitude(a)<3.5);
 assert.deepEqual(sampleSuspensionMotion('single',m),a);
 const rest={...m,speed:0};
 assert.equal(magnitude(sampleSuspensionMotion('two',rest)),0);
 const brake=sampleSuspensionMotion('two',{...rest,momentum:{drive:0,brake:1}});
 const tail=sampleSuspensionMotion('two',{...rest,momentum:{drive:0,brake:.25}});
 assert.ok(magnitude(brake)>magnitude(tail)&&magnitude(tail)>0);
 assert.ok(magnitude(sampleSuspensionMotion('single',{...m,posture:'crouch'}))<magnitude(a));
});
test('SR12 free pose moves with phase while held-one contact stays fixed',()=>{
 const p={mode:'front-slung',sling:'two',scale:new THREE.Vector3(1,1,1),heldPosition:new THREE.Vector3(8,3,0),heldQuaternion:new THREE.Quaternion(),primaryGrip:new THREE.Vector3(6,-3,1),supportGrip:new THREE.Vector3(15,-2,-1),balanceX:1,armorPush:0,pack:false,chestHeight:35,muzzleX:19.5,stockX:-13.5,motion:m};
 const a=sampleRetentionPose(p),b=sampleRetentionPose({...p,motion:{...m,stride:.65}});
 assert.ok(a.position.distanceTo(b.position)>.05);
 assert.deepEqual(sampleRetentionPose({...p,mode:'held-one'}),sampleRetentionPose({...p,mode:'held-one',motion:{...m,stride:.65}}));
});
