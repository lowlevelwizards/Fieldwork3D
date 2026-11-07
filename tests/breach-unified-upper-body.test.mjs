/** UOP paired-fit authority: exact cache and actor isolation contracts.
 * Legacy math remains unchanged; this tests orchestration, not new poses.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cachedCoupledUpperBody,cachedCoordinatedUpperBody,
 cachedSupportUpperBody,MAX_SHARED_IDLE_FITS}
 from '../src/breach-unified-upper-body.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const config=selectWeaponFamilyPreset(
 initialWeaponConfiguration('carbine'),'ar-m4a1');
const empty={armor:'armor-bare',rig:'no-rig',top:'bdu-shirt',
 front:5,boxes:[]};
const shoulders=[V(1,4,-7),V(1,4,7)];
const fit={origin:V(0,0,0),rotation:new THREE.Euler(),
 stock:V(-7,0,6),primary:V(6,-3,7),support:V(8,-5,-7),
 twoHanded:true,primaryReachable:true,handling:'ready',
 contactError:0,stockError:0};

test('UOP coupled candidate is bounded, per-rig or safely shared',()=>{
 const one={},two={};
 const req={weapon:'carbine',configuration:config,envelope:empty,
   shoulders,localYaw:0,poseWeight:0,allowVisualOverlap:false};
 const a=cachedCoupledUpperBody(one,req);
 const b=cachedCoupledUpperBody(one,req);
 const c=cachedCoupledUpperBody(two,req);
 assert.equal(b.cached,true);
 assert.equal(b.source,'rig');
 assert.strictEqual(b.result,a.result);
 assert.equal(c.cached,true,'equivalent kits share pre-fitted idle pose');
 assert.strictEqual(c.result,a.result);
 assert.equal(MAX_SHARED_IDLE_FITS,80);
 const moved=cachedCoupledUpperBody(one,{...req,localYaw:.2});
 assert.equal(moved.source,'fresh');
 const staleGuard=cachedCoupledUpperBody(one,req);
 assert.equal(staleGuard.cached,true,
   'rig can retrieve an approved earlier pose from bounded shared cache');
});
test('UOP coordinated contact cache invalidates exact aim, armor and actions',()=>{
 const one={},two={};
 const req={weapon:'carbine',configuration:config,fit,
   shoulders,envelope:empty,mode:'carry',
   chestRotation:new THREE.Euler()};
 const a=cachedCoordinatedUpperBody(one,req);
 const b=cachedCoordinatedUpperBody(one,req);
 assert.equal(a.cached,false);
 assert.equal(b.cached,true);
 assert.strictEqual(a.result,b.result);
 assert.equal(a.result.status,'clear');
 const other=cachedCoordinatedUpperBody(two,req);
 assert.equal(other.cached,false,'no cross-actor mutable coordinated result');
 const changed=cachedCoordinatedUpperBody(one,{
   ...req,chestRotation:new THREE.Euler(0,.0002,0)});
 assert.equal(changed.cached,false);
 const armor=cachedCoordinatedUpperBody(one,{
   ...req,envelope:{...empty,armor:'plate-heavy'}});
 assert.equal(armor.cached,false);
 const released=cachedCoordinatedUpperBody(one,{
   ...req,releasedSupportTarget:V(6,0,-3),mode:'reload'});
 assert.equal(released.cached,false);
});
test('UOP support-grip candidate choice is reused but never shared blindly',()=>{
 const one={},two={};
 const req={weapon:'carbine',configuration:config,
   fit:{...fit,support:V(30,-1,-3)},
   shoulder:shoulders[0],firingShoulder:shoulders[1],
   envelope:empty,mode:'carry'};
 const a=cachedSupportUpperBody(one,req);
 const b=cachedSupportUpperBody(one,req);
 assert.equal(b.cached,true);
 assert.strictEqual(a.result,b.result);
 assert.equal(a.result.selected,true);
 assert.equal(cachedSupportUpperBody(two,req).cached,false);
 assert.equal(cachedSupportUpperBody(one,{
  ...req,fit:{...req.fit,rotation:new THREE.Euler(0,.015,0)}
 }).cached,false);
});
