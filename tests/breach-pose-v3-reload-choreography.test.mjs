import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {choreographV3ReloadHand,v3MagazineRockAngle}
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

test('B14 AR/AK handoffs have distinct bounded approach arcs and exact sockets',()=>{
 const keyframes=[0,.20,.30,.32,.75,.82,.90,1];
 for(const family of ['ar','ak','hk']){
  for(const t of keyframes){
   const original=choreograph(t).target;
   const variant=choreographV3ReloadHand({...input,family,progress:t}).target;
   assert.ok(variant.distanceTo(original)<1e-8,
    family+' should preserve physical attachment point at '+t);
  }
  for(const t of [.20,.32,.75,.82]){
   const before=choreographV3ReloadHand({...input,family,progress:t-1e-6}).target;
   const after=choreographV3ReloadHand({...input,family,progress:t+1e-6}).target;
   assert.ok(before.distanceTo(after)<.005,
    family+' continuous at magazine handoff '+t);
  }
 }
 for(const t of [.16,.39,.785]){
  const ak=choreographV3ReloadHand({...input,family:'ak',progress:t}).target;
  const ar=choreographV3ReloadHand({...input,family:'ar',progress:t}).target;
  assert.ok(ak.distanceTo(ar)>.15,
   'AK rock-in approach must differ from AR straight insertion '+t);
 }
 const shell=choreographV3ReloadHand({...input,family:'ak',mode:'shells',progress:.52});
 assert.ok(shell.target.distanceTo(choreographV3ReloadHand({
  ...input,mode:'shells',progress:.52}).target)<1e-12);
});

test('B15 AK rock-in is bounded, exact at feed-lip contact and replay-stable',()=>{
 for(const t of [0,.20,.29,.32,.60,.82,.90,1]){
  assert.equal(v3MagazineRockAngle(t,'emergency','ak'),0,
   'no detached magazine rotation at contact keyframe '+t);
 }
 assert.ok(Math.abs(v3MagazineRockAngle(.75,'emergency','ak')-.14)<1e-12);
 for(const t of [.62,.69,.75,.78,.81]){
  const a=v3MagazineRockAngle(t,'emergency','ak');
  const b=v3MagazineRockAngle(t,'emergency','ak');
  assert.equal(a,b,'pure timestamp-driven magazine rotation');
  assert.ok(a>=0&&a<=.140000001,'no over-rotation');
  assert.equal(v3MagazineRockAngle(t,'emergency','ar'),0);
  assert.equal(v3MagazineRockAngle(t,'emergency','hk'),0);
  assert.equal(v3MagazineRockAngle(t,'shells','ak'),0);
 }
 for(const t of [.61,.75,.82]){
  const a=v3MagazineRockAngle(t-1e-5,'emergency','ak');
  const b=v3MagazineRockAngle(t+1e-5,'emergency','ak');
  assert.ok(Math.abs(b-a)<.0005,'smooth pivot boundary '+t);
 }
});

test('B18 alternative corridors keep exact mounting frames and smooth handoff',()=>{
 for(const corridor of ['canonical','compact','outboard']){
  for(const t of [0,.20,.30,.32,.75,.82,.90,1]){
   const variant=choreographV3ReloadHand({...input,
    family:'ak',corridor,progress:t}).target;
   const baseline=choreographV3ReloadHand({...input,
    family:'ak',corridor:'canonical',progress:t}).target;
   assert.ok(variant.distanceTo(baseline)<1e-10,
    corridor+'/exact magazine socket '+t);
  }
  for(const t of [.20,.32,.75,.82,.90]){
   const a=choreographV3ReloadHand({...input,
    family:'ak',corridor,progress:t-.000001}).target;
   const b=choreographV3ReloadHand({...input,
    family:'ak',corridor,progress:t+.000001}).target;
   assert.ok(a.distanceTo(b)<.005,
    corridor+'/continuous handoff '+t);
  }
 }
});

test('B22 magazine-body palm changes only the free hand, never the mounted socket',()=>{
 for(const family of ['ar','ak','hk']){
  for(const palm of ['upper-body','mid-body']){
   for(const t of [0,1]){
    const changed=choreographV3ReloadHand({...input,
     family,magazinePalm:palm,progress:t}).target;
    const old=choreographV3ReloadHand({...input,
     family,magazinePalm:'legacy',progress:t}).target;
    assert.ok(changed.distanceTo(old)<1e-10,family+'/'+palm+'/endpoint');
   }
   const variant=choreographV3ReloadHand({...input,
    family,magazinePalm:palm,progress:.30}).target;
   const old=choreographV3ReloadHand({...input,
    family,magazinePalm:'legacy',progress:.30}).target;
   assert.ok(variant.distanceTo(old)>1.0,family+'/'+palm+'/body grip');
   const repeat=choreographV3ReloadHand({...input,
    family,magazinePalm:palm,progress:.30}).target;
   assert.ok(variant.distanceTo(repeat)<1e-12,'time pure');
  }
 }
});
