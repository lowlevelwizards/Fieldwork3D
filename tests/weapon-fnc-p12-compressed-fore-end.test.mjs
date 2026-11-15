/** FNC P12: same iconic two-zone front-end with corrected assembly relations. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const get=(g,k)=>g.children.find(c=>c.userData[k]);
const all=(g,k)=>g.children.filter(c=>c.userData[k]);
const box=x=>new THREE.Box3().setFromObject(x);
const size=(x,k)=>box(x).max[k]-box(x).min[k];
const touch=(a,b)=>box(a).intersectsBox(box(b));
test('P13 further nested front end preserves physical-overlap contracts',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const polymer=get(g,'fncP11ShortWidePolymer'),gas=get(g,'fncP12CompressedGasCover'),
  stop=get(g,'fncP12ChunkyHandstop'),seat=get(g,'fncP7ContinuousGasSightSeat');
 assert.ok(polymer&&gas&&stop&&seat);
 assert.ok(box(gas).min.x<2.60&&box(gas).max.x<14.0);
 assert.ok(box(gas).min.y<-.40&&box(gas).max.y>1.48);
 assert.ok(box(gas).min.y<box(polymer).max.y-.35,
  'gas cover must nest visibly down into polymer');
 assert.ok(box(seat).min.x<12.7&&box(seat).max.x<15.5);
 assert.ok(box(seat).min.x<box(gas).max.x-1.2,
  'broad sight base and vented cover must overlap significantly');
 assert.ok(touch(gas,polymer)&&touch(gas,seat));
 assert.ok(touch(stop,polymer)&&touch(stop,gas),
  'molded stop must belong to both overlapping visual zones');
 assert.ok(size(gas,'z')<size(polymer,'z')*.70);
 assert.ok(size(gas,'x')>size(polymer,'x')+3.0);
 assert.ok(Math.abs(box(g).max.x-FNC_P1.muzzleX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});
test('P13 handstop has one faceted molded collar and no rectangular fin',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const stop=get(g,'fncP12ChunkyHandstop'),polymer=get(g,'fncP11ShortWidePolymer');
 assert.ok(stop&&polymer);
 assert.ok(size(stop,'x')>.50&&size(stop,'x')<.60);
 assert.ok(size(stop,'z')>size(polymer,'z')+.11);
 assert.ok(size(stop,'y')>2.60&&size(stop,'y')<2.80);
 assert.equal(stop.geometry.type,'BufferGeometry');
 assert.equal(all(g,'fncP12ChunkyHandstop').length,1);
 clearWeaponSilhouette(g);m.dispose();
});
test('P12 front is exactly two cuboid FAL-family ears without central prong',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const ears=all(g,'fncP12FALLikeFrontEar');
 assert.equal(ears.length,2);
 assert.ok(ears.every(e=>e.geometry.type==='ExtrudeGeometry'));
 const left=ears.find(e=>e.userData.fncP12FALLikeFrontEar==='left');
 const right=ears.find(e=>e.userData.fncP12FALLikeFrontEar==='right');
 assert.ok(left&&right);
 assert.ok(box(left).max.z<box(right).min.z);
 assert.ok(ears.every(e=>touch(e,get(g,'fncP7ContinuousGasSightSeat'))));
 assert.ok(ears.every(e=>Math.abs((box(e).max.x+box(e).min.x)/2-14.26)<.02));
 assert.ok(ears.every(e=>box(e).max.y<3.12));
 assert.equal(Boolean(get(g,'fncP11TwinEarFrontSight')),false);
 clearWeaponSilhouette(g);m.dispose();
});
test('P12 gas slots follow translated cover on top and both sides',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const gas=get(g,'fncP12CompressedGasCover');
 const side=all(g,'fncP11BrokenGasSideSlots');
 const roof=get(g,'fncP11TopGasVentRow');
 assert.ok(gas&&roof);assert.equal(side.length,2);
 for(const slots of [...side,roof]){
  const r=box(slots);
  assert.ok(r.min.x>box(gas).min.x+.2 && r.max.x<box(gas).max.x-.3);
 }
 assert.ok(Math.abs(box(roof).min.y-box(gas).max.y)<.07);
 for(const s of side)assert.ok(box(s).min.y>box(gas).min.y&&
  box(s).max.y<box(gas).max.y);
 assert.equal(roof.geometry.getAttribute('position').count,30);
 clearWeaponSilhouette(g);m.dispose();
});
test('P12 production and suppressor paths unchanged at outer anchors and stock',()=>{
 const m=new THREE.MeshBasicMaterial();
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const full=buildWeaponSilhouette('rifle',m,m,config);
 assert.equal(all(full,'fncP12FALLikeFrontEar').length,2);
 assert.ok(get(full,'fncP10DarkThickButtpad'));
 assert.ok(get(full,'fncP12ChunkyHandstop'));
 const noMuzzle=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!get(noMuzzle,'fncMuzzle'));
 assert.ok(touch(get(noMuzzle,'fncServiceBarrel'),get(noMuzzle,'fncP12CompressedGasCover')));
 assert.ok(Math.abs(box(noMuzzle).min.x-FNC_P1.stockRearX)<.02);
 assert.ok(Math.abs(box(noMuzzle).max.x-FNC_P1.muzzleX)<.02);
 clearWeaponSilhouette(full);clearWeaponSilhouette(noMuzzle);m.dispose();
});
