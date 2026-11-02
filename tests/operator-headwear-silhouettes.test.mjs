import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,HEAD_SILHOUETTE_METRICS}
 from '../src/operator-headwear-silhouettes.ts';
const material=new THREE.MeshStandardMaterial();
const built=(id)=>createHeadwearSilhouette(id,material);
const box=(g)=>new THREE.Box3().setFromObject(g);
const piece=(group,name)=>group.children.find(x=>x.name===name);
test('every Stage 1B component is an intentional cuboid, not a faceted/extruded shell',()=>{
 for(const id of ['patrol-cap','ach','high-cut']){
  const g=built(id);
  assert.ok(g.children.length>=5&&g.children.length<=8,id);
  assert.equal(g.userData.primitive,'cuboids-only');
  assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  for(const p of g.children){
   assert.equal(p.geometry.type,'BoxGeometry',id+'/'+p.name);
   assert.ok(p.geometry.index.count===36);
   assert.ok(p.position.toArray().every(Number.isFinite));
  }
 }
});
test('patrol cap has flat bill forward of a shallow, rectangular crown',()=>{
 const cap=built('patrol-cap');
 const crown=piece(cap,'soft-flat-crown');
 const bill=piece(cap,'flat-short-bill');
 assert.ok(crown&&bill);
 assert.ok(crown.geometry.parameters.height<2);
 assert.ok(bill.geometry.parameters.height<.6);
 assert.ok(bill.geometry.parameters.width>bill.geometry.parameters.depth);
 assert.ok(box(bill).min.z<box(crown).min.z-2.5);
 assert.ok(box(cap).max.y<9.1);
});
test('ACH deep coverage and high-cut open ears are demonstrably different cuboid silhouettes',()=>{
 const ach=built('ach'),high=built('high-cut');
 const achEar=piece(ach,'ach-deep-left-ear');
 const highTemple=piece(high,'highcut-left-temple');
 assert.ok(achEar&&highTemple);
 assert.ok(box(highTemple).min.y-box(achEar).min.y>3.0);
 assert.ok(box(ach).max.y>box(high).max.y);
 assert.ok(achEar.geometry.parameters.height>highTemple.geometry.parameters.height*3);
 assert.ok(HEAD_SILHOUETTE_METRICS.ach.earEdge<
   HEAD_SILHOUETTE_METRICS['high-cut'].earEdge-3);
 assert.ok(piece(ach,'ach-nape').geometry.parameters.height>
   piece(high,'highcut-short-nape').geometry.parameters.height);
});
test('cuboid shells cover the skull without projecting absurdly beyond it',()=>{
 for(const id of ['patrol-cap','ach','high-cut']){
  const b=box(built(id));
  assert.ok(b.min.x>=-5.6&&b.max.x<=5.6,id);
  assert.ok(b.max.z<=5.9&&b.min.z>=-8.3,id);
  assert.ok(b.min.y>2.5&&b.max.y<10.6,id);
 }
});
