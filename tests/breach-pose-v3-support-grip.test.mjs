import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {chooseV3SupportGrip,V3_SUPPORT_GRIP_FRACTIONS}
 from '../src/breach-pose-v3-support-grip.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const config=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const fit={origin:V(0,0,0),rotation:new THREE.Euler(0,0,0),
 stock:V(-8,0,0),primary:V(3,-2,2),support:V(30,-1,-3),
 twoHanded:false,primaryReachable:true,handling:'ready',
 contactError:15,stockError:0};
const env={armor:'armor-bare',rig:'no-rig',top:'bdu-shirt',front:5,boxes:[]};
const input={weapon:'carbine',configuration:config,fit,
 shoulder:V(1,4,-7),firingShoulder:V(1,4,7),envelope:env,mode:'carry'};
test('V3 support grip moves only the support contact on real furniture',()=>{
 const r=chooseV3SupportGrip(input);
 assert.equal(r.selected,true);
 assert.equal(r.reason,'valid');
 assert.ok(V3_SUPPORT_GRIP_FRACTIONS.includes(r.fraction));
 assert.ok(r.fit.support.distanceTo(input.shoulder)<19.92);
 assert.ok(r.fit.support.distanceTo(fit.support)>1);
 assert.ok(r.fit.origin.distanceTo(fit.origin)<1e-9);
 assert.ok(r.fit.primary.distanceTo(fit.primary)<1e-9);
 assert.equal(r.fit.rotation.y,fit.rotation.y);
 assert.equal(r.candidates,V3_SUPPORT_GRIP_FRACTIONS.length);
});
test('V3 support grip cannot ignore a massive rigid obstruction',()=>{
 const blocked={...env,boxes:[{label:'torso',material:'rigid',
  min:{x:-30,y:-30,z:-30},max:{x:30,y:30,z:30}}]};
 const r=chooseV3SupportGrip({...input,envelope:blocked});
 assert.equal(r.selected,false);
 assert.equal(r.fit,fit);
 assert.equal(r.reason,'unresolved');
});
