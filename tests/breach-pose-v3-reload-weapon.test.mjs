import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {choreographV3ReloadWeapon}
 from '../src/breach-pose-v3-reload-weapon.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const fit={origin:V(2,-1,3),
 rotation:new THREE.Euler(.07,.21,-.12),
 stock:V(-9,2,7),primary:V(3,-2,8),support:V(12,-3,-4),
 twoHanded:true,primaryReachable:true,handling:'low',
 contactError:0,stockError:0};
test('V3 reload presentation is exactly neutral at start and finish',()=>{
 for(const mode of ['emergency','retention','shells']){
  for(const t of [0,1]){
   const v=choreographV3ReloadWeapon(fit,t,mode);
   assert.equal(v.fit,fit);
   assert.equal(v.weight,0);
  }
 }
});
test('V3 rifle cants around stock while maintaining every rigid socket',()=>{
 const v=choreographV3ReloadWeapon(fit,.5,'emergency');
 assert.ok(v.weight>.99);
 assert.ok(v.fit.stock.distanceTo(fit.stock)<1e-12);
 const before=new THREE.Quaternion().setFromEuler(fit.rotation);
 const after=new THREE.Quaternion().setFromEuler(v.fit.rotation);
 const delta=after.clone().multiply(before.clone().invert());
 for(const k of ['primary','support','origin']){
  const expect=fit[k].clone().sub(fit.stock)
   .applyQuaternion(delta).add(fit.stock);
  assert.ok(expect.distanceTo(v.fit[k])<1e-8,k+' socket rigid');
 }
 assert.ok(v.fit.primary.z>fit.primary.z,
  'firing hand should move outward from side fabric');
 assert.ok(after.angleTo(before)<.20);
});
test('V3 pose is deterministic, continuous and shell reload remains untouched',()=>{
 for(const t of [.04,.16,.35,.72,.88,.99]){
  const a=choreographV3ReloadWeapon(fit,t,'retention');
  const b=choreographV3ReloadWeapon(fit,t,'retention');
  assert.ok(a.fit.primary.distanceTo(b.fit.primary)<1e-12);
  const before=choreographV3ReloadWeapon(fit,t-.0001,'retention');
  const after=choreographV3ReloadWeapon(fit,t+.0001,'retention');
  assert.ok(before.fit.primary.distanceTo(after.fit.primary)<.015,
   'no frame boundary snap '+t);
 }
 assert.equal(choreographV3ReloadWeapon(fit,.5,'shells').fit,fit);
});
