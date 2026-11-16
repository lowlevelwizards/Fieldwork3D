/** FN FNC P9 — reference-based stock grammar and modular art integrity. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_P1,buildFNCStage1Silhouette}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';

const box=x=>new THREE.Box3().setFromObject(x);
const get=(g,key)=>g.children.find(c=>c.userData[key]);
const overlaps=(a,b)=>box(a).intersectsBox(box(b));
const coord=(mesh,x,y)=>{const p=mesh.geometry.getAttribute('position');
 for(let i=0;i<p.count;i++)
  if(Math.abs(p.getX(i)-x)<.005&&Math.abs(p.getY(i)-y)<.005)return true;
 return false;
};
test('P9 stock lower rail is straight until its deliberate downward knee',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const lower=get(g,'fncP9ParallelThenAngled'),upper=get(g,'fncP9UpperMetalRail');
 assert.ok(lower&&upper);
 assert.ok(coord(lower,-6.52,-1.29)&&coord(lower,-10.18,-1.29),
  'lower top beam remains horizontal until the knee');
 assert.ok(coord(lower,-14.38,-3.09),
  'lower beam slopes into the rear butt instead of straightening early');
 assert.ok(box(upper).min.y>box(lower).max.y+.25,
  'two bars leave the receiver separately instead of forming a filled triangle');
 assert.ok(box(lower).max.x>-6.6&&box(lower).min.x<-14.3);
 clearWeaponSilhouette(g);m.dispose();
});
test('P9 stock five structural parts meet as a real open construction',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const top=get(g,'fncP9UpperMetalRail');
 const lower=get(g,'fncP9ParallelThenAngled'),hinge=get(g,'fncP9BlockHinge');
 const pad=get(g,'fncP9ConnectedButtplate');
 const plate=get(g,'fncP9RecessedJoiningPlate');
 assert.ok(top&&lower&&hinge&&pad&&plate);
 assert.ok(overlaps(hinge,top)&&overlaps(hinge,lower),
  'rectangular hinge must meet both stock rails');
 assert.ok(!get(g,'fncCheekSleeve'),'cheek sleeve must be fully removed');
 assert.ok(overlaps(top,pad)&&overlaps(lower,pad),
  'both uninterrupted bars must land inside distinct butt assembly');
 assert.ok(overlaps(plate,top)&&overlaps(plate,lower),
  'flat internal connector plate must attach to both metal rails');
 assert.ok(box(plate).max.z<box(lower).max.z &&
  box(plate).max.z<box(top).max.z,
  'plate must be inset into metal rather than pasted over rails');
 assert.ok(box(plate).max.x-box(plate).min.x>3.5 &&
   box(plate).max.x-box(plate).min.x<3.8 &&
  box(plate).max.y-box(plate).min.y<2.5,
  'connector stays a plate, never a solid full-stock triangle');
 assert.ok(Math.abs(box(g).min.x-FNC_P1.stockRearX)<.02);
 clearWeaponSilhouette(g);m.dispose();
});
test('P9 stock is chunky in 3D, but geometry stays sparse and modular',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const hinge=get(g,'fncP9BlockHinge'),pad=get(g,'fncP9ConnectedButtplate');
 const lower=get(g,'fncP9ParallelThenAngled');
 const plate=get(g,'fncP9RecessedJoiningPlate');
 assert.ok(box(hinge).max.z-box(hinge).min.z>
  box(lower).max.z-box(lower).min.z+.5);
 assert.ok(box(pad).max.z-box(pad).min.z>
  box(lower).max.z-box(lower).min.z+.5);
 assert.ok(box(plate).max.z-box(plate).min.z<
  box(lower).max.z-box(lower).min.z-.1);
 assert.equal(g.children.filter(x=>x.userData.fncStockRail===true).length,2);
 assert.equal(g.children.filter(x=>x.userData.fncP9RecessedJoiningPlate).length,1);
 assert.ok(g.children.length<=34,'no unnecessary stock decoration');
 assert.ok(g.children.every(x=>x.name.startsWith('family-')));
 clearWeaponSilhouette(g);m.dispose();
});
test('P9 trigger guard removed in preview and real factory, no other family affected',()=>{
 const m=new THREE.MeshBasicMaterial();
 const preview=buildFNCStage1Silhouette(m);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const factory=buildWeaponSilhouette('rifle',m,m,cfg);
 for(const g of [preview,factory]){
  assert.ok(!get(g,'fncP8OpenTriggerGuard'));
  assert.ok(g.children.every(x=>!x.name.includes('trigger-guard')));
  assert.ok(get(g,'fncP9ConnectedButtplate'));
  assert.ok(get(g,'fncP9BlockHinge'));
  assert.ok(get(g,'fncP9RecessedJoiningPlate'));
  assert.ok(get(g,'fncP8DistinctMagwell'));
 }
 const suppressed=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!get(suppressed,'fncMuzzle'));
 assert.ok(Math.abs(box(suppressed).max.x-FNC_P1.muzzleX)<.02);
 for(const g of [preview,factory,suppressed])clearWeaponSilhouette(g);
 m.dispose();
});
