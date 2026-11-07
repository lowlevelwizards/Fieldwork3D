import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {choreographV3ReloadHand}
 from '../src/breach-pose-v3-reload-choreography.ts';
import {reloadHandChestTarget}
 from '../src/breach-reload-motion.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const fit={origin:V(2,0,1),rotation:new THREE.Euler(.03,.18,-.08),
 support:V(9,-4,-7),primary:V(7,-3,6)};
const input={fit,lengthScale:1,mode:'emergency',
 supportX:6,supportY:-4,primaryX:3,
 magazineSocket:{x:3.7,y:-2.5}};
const choreograph=t=>choreographV3ReloadHand({...input,progress:t});
test('V3 reload route preserves actual grip and magazine sockets',()=>{
 for(const t of [0,.2,.3,.32,.75,.82,.9,1]){
  const v=choreograph(t);
  const real=reloadHandChestTarget({...input,progress:t});
  assert.ok(v.target.distanceTo(real)<1e-8,
   'do not shift magazine/grip contact at time '+t);
 }
 assert.ok(choreograph(0).target.distanceTo(fit.support)<1e-8);
 assert.ok(choreograph(1).target.distanceTo(fit.support)<1e-8);
});
test('V3 reload route moves free transit outboard and stays time-pure',()=>{
 for(const t of [.09,.52,.95]){
  const target=choreograph(t);
  const old=reloadHandChestTarget({...input,progress:t});
  assert.ok(target.target.z<old.z-.1,'support hand outboard '+t);
  assert.ok(target.target.x>old.x+.1,'hand forward '+t);
  assert.ok(target.target.distanceTo(choreograph(t).target)<1e-12,
   'replay-safe same action timestamp');
 }
});
test('V3 route keeps shell-loading handling family separate',()=>{
 const shell=choreographV3ReloadHand({
  ...input,mode:'shells',progress:.52
 });
 const original=reloadHandChestTarget({...input,mode:'shells',progress:.52});
 assert.ok(shell.target.distanceTo(original)<1e-8,
  'shell insertion should not get magazine-transport displacement');
});
test('V3 route is continuous at all authored contact transitions',()=>{
 for(const t of [.2,.32,.75,.9]){
  const before=choreograph(t-.000001).target;
  const after=choreograph(t+.000001).target;
  assert.ok(before.distanceTo(after)<.005,'time boundary '+t);
 }
});

test('V3 magazine transport stays outside rigid torso at mid transit',()=>{
 const result=choreographV3ReloadHand({
  ...input,clearanceFront:8.0,progress:(.32+.75)/2
 });
 assert.equal(result.segment,'transport');
 assert.ok(result.target.x>=9.25-1e-8,'front of fitted carrier');
 assert.ok(result.target.z<=-7.5+1e-8,'outside support-side torso');
 for(const t of [.32,.75]){
  const a=choreographV3ReloadHand({...input,clearanceFront:8,progress:t});
  const b=reloadHandChestTarget({...input,progress:t});
  assert.ok(a.target.distanceTo(b)<1e-8,'mount/contact endpoint '+t);
 }
});
