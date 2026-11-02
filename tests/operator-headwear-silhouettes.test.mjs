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

test('connected helmet assemblies have no physical gaps at brow, temple, rear or crown',()=>{
 const intersects=(a,b)=>{
  const x=new THREE.Box3().setFromObject(a);
  const y=new THREE.Box3().setFromObject(b);
  // Require a positive overlap volume, not a face-only touch that creates
  // a floating seam or becomes a gap with subpixel raster precision.
  const overlap=new THREE.Box3().copy(x).intersect(y);
  return !overlap.isEmpty()&&overlap.getSize(new THREE.Vector3())
   .toArray().every(axis=>axis>.08);
 };
 for(const id of ['ach','high-cut']){
  const g=built(id),prefix=id==='ach'?'ach':'highcut';
  const shell=piece(g,id==='ach'?'ach-primary-shell':'highcut-compact-shell');
  const upper=piece(g,id==='ach'?'ach-stepped-upper-crown':'highcut-stepped-top');
  const brow=piece(g,prefix+'-brow');
  const nape=piece(g,id==='ach'?'ach-nape':'highcut-short-nape');
  const sides=id==='ach'?['ach-deep-left-ear','ach-deep-right-ear']:
   ['highcut-left-temple','highcut-right-temple'];
  assert.ok(intersects(shell,upper),id+' crown');
  assert.ok(intersects(shell,brow),id+' brow');
  assert.ok(intersects(shell,nape),id+' nape');
  for(const side of sides){
   const part=piece(g,side);
   for(const [name,other] of [['main shell',shell],['front brow',brow]])
    assert.ok(intersects(part,other),id+' '+side+' must meet '+name);
   if(id==='ach')
    assert.ok(intersects(part,nape),id+' '+side+' must join nape');
   else
    assert.ok(!intersects(part,nape),
      'high-cut must have a genuinely open center ear region');
  }
 }
});
test('cap crown joins wrap and bill, with no disconnected rectangular tabs',()=>{
 const cap=built('patrol-cap'),part=name=>piece(cap,name);
 const overlap=(a,b)=>{
  const intersection=new THREE.Box3().setFromObject(a)
    .intersect(new THREE.Box3().setFromObject(b));
  return !intersection.isEmpty()&&intersection.getSize(
   new THREE.Vector3()).toArray().every(v=>v>.08);
 };
 for(const id of ['forehead-band','left-soft-side','right-soft-side','rear-band']){
  assert.ok(overlap(part(id),part('soft-flat-crown')),id+' must join crown');
 }
 assert.ok(overlap(part('flat-short-bill'),part('forehead-band')),
  'bill must be seated in brow, not floating under it');
 assert.ok(overlap(part('left-soft-side'),part('forehead-band')));
 assert.ok(overlap(part('right-soft-side'),part('forehead-band')));
});

test('side panels are inset from the outer face to avoid near-coplanar flicker',()=>{
 const ach=built('ach'),high=built('high-cut');
 for(const [group,bodyName,panelName] of [
  [ach,'ach-primary-shell','ach-deep-right-ear'],
  [high,'highcut-compact-shell','highcut-right-temple']
 ]){
  const main=piece(group,bodyName),panel=piece(group,panelName);
  const mainExtent=box(main).max.x,panelExtent=box(panel).max.x;
  assert.ok(mainExtent-panelExtent>=.14,
   'side panel must be safely inset from the main crown surface');
 }
});
test('high-cut has an actual center-side ear opening, not a continuous lower band',()=>{
 const high=built('high-cut');
 const side=piece(high,'highcut-right-temple');
 const nape=piece(high,'highcut-short-nape');
 const bounds=box(side);
 assert.ok(bounds.max.z<2.0,'side return must stop ahead of rear');
 assert.ok(bounds.min.z<-4.4,'side return joins the brow');
 assert.ok(box(nape).min.z>3.8,'rear skirt leaves side ear opening');
 const main=piece(high,'highcut-compact-shell');
 assert.ok(box(main).min.y>6.7,'main shell sits high above ear');
});
