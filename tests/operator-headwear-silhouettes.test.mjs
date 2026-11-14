import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHeadwearSilhouette,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
const mat=new THREE.MeshStandardMaterial();
const build=id=>createHeadwearSilhouette(id,mat);
const box=o=>new THREE.Box3().setFromObject(o);
const byName=(v,n)=>v.find(x=>x.name===n);
const lowerAt=(volumes,x,z)=>{
 let lowest=Infinity;
 for(const v of volumes){
  if(Math.abs(v.x-x)<=v.width/2+1e-6&&
     Math.abs(v.z-z)<=v.depth/2+1e-6)
   lowest=Math.min(lowest,v.y-v.height/2);
 }
 return lowest;
};
test('patrol cap preserves one merged surface while wrapping actual head',()=>{
 const cap=build('patrol-cap');
 const v=headwearCuboidVolumes('patrol-cap');
 assert.equal(cap.children.length,1);
 assert.equal(cap.children[0].geometry.userData.greedyCuboidUnion,true);
 assert.equal(v.length,10,'fitted crown, single fitted band, one anchored bill');
 const bill=byName(v,'patrol-anchored-bill');
 const band=byName(v,'patrol-front-band');
 assert.ok(band&&band.width>8.8);
 const crown=byName(v,'patrol-integrated-crown');
 assert.ok(bill&&crown);
 assert.ok(bill.z-bill.depth/2<crown.z-crown.depth/2-2.8);
 assert.ok(bill.height>=.7,'structural bill, not a paper-thin trim');
 assert.ok(lowerAt(v,4.4,0)<5,'real upper temple coverage');
 assert.ok(box(cap).max.y<8.5);
});
test('two helmet families render single joined faceless-interior cuboid exterior',()=>{
 for(const id of ['ach','high-cut']){
  const g=build(id);
  assert.equal(g.children.length,1,id);
  assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  const geometry=g.children[0].geometry;
  assert.equal(geometry.type,'BufferGeometry');
  if(id==='ach')assert.equal(geometry.userData.h17UnifiedContour,true);
  else{
   assert.ok(geometry.userData.greedyCuboidUnion);
   assert.equal(geometry.userData.cuboids.length,headwearCuboidVolumes(id).length);
  }
  assert.ok(geometry.index.count>=36);
  for(const n of geometry.getAttribute('position').array)
   assert.ok(Number.isFinite(n));
  const normals=geometry.getAttribute('normal');
  for(let i=0;i<normals.count;i++){
   const v=[normals.getX(i),normals.getY(i),normals.getZ(i)];
   assert.ok(v.every(Number.isFinite),'finite headwear face normal');
   if(id==='high-cut')assert.ok(v.filter(n=>Math.abs(n)>1-1e-5).length===1,
    'unchanged high-cut faces remain orthogonal');
  }
  assert.equal(g.children[0].receiveShadow,false);
 }
});
test('ACH uses one decisive side drop instead of narrow stepping',()=>{
 const v=headwearCuboidVolumes('ach');
 const brow=byName(v,'ach-protective-brow'),ear=byName(v,'ach-right-ear-nape');
 assert.ok(brow&&ear);
 assert.ok(lowerAt(v,4.4,0)<3.5,'ACH retains ear coverage with raised scallop');
 assert.ok(lowerAt(v,4.4,-3)<6,'temple descends from brow');
 assert.ok(lowerAt(v,0,-5)<4.6,'front edge is near implied brow');
 assert.ok(lowerAt(v,0,4.95)<2.9,'protective lower rear skull');
 assert.ok(box(build('ach')).max.y<9.0,'crown no longer sits far above head');
});
test('high-cut exposes actual ear region and differs without accessory rails',()=>{
 const high=headwearCuboidVolumes('high-cut'),ach=headwearCuboidVolumes('ach');
 assert.ok(lowerAt(high,4.4,0)>5.8,'high-cut retains real ear clearance');
 assert.ok(lowerAt(high,4.4,0)-lowerAt(ach,4.4,0)>2);
 assert.ok(lowerAt(high,4.4,-3)<7);
 assert.ok(lowerAt(high,0,4.95)<3.4,'high-cut still protects rear skull');
 assert.ok(box(build('high-cut')).max.y<=10.2);
 const side=byName(high,'highcut-right-temple');
 assert.ok(side.z+side.depth/2<0,'front side return stops before ear');
});
test('both fit head dimensions without changing proportions or scale',()=>{
 for(const id of ['ach','high-cut']){
  const b=box(build(id));
  assert.ok(b.min.x>=-5.6&&b.max.x<=5.6);
  assert.ok(b.min.z>=-6&&b.max.z<=5.9);
  assert.ok(b.min.y>=(id==='ach'?2.0:2.1)&&b.max.y<9.0);
 }
});

test('H17 ACH has one integrated side contour, not stacked guard plates',()=>{
 const ach=headwearCuboidVolumes('ach');
 const high=headwearCuboidVolumes('high-cut');
 assert.equal(ach.length,5,'crown, brow, rear, two coarse fit envelopes');
 assert.equal(high.length,5,'High-Cut remains unchanged');
 assert.ok(ach.every(v=>!/temple|ear-wrap|nape-return/.test(v.name)));
 const shell=build('ach'),geo=shell.children[0].geometry;
 assert.equal(shell.children.length,1);
 assert.equal(geo.userData.h17UnifiedContour,true);
 assert.ok(geo.userData.exteriorQuads<=30);
 assert.equal(geo.userData.achMichCrownInset,.53);
 assert.equal(build('high-cut').userData.stage,'1E');
 assert.ok(Math.abs(lowerAt(ach,4.4,0)-2.04)<.01);
 assert.ok(Math.abs(lowerAt(ach,0,4.6)-2.35)<.01);
 assert.ok(Math.abs(lowerAt(high,4.4,0)-5.95)<.01);
});

test('ACH first-pass top chamfer is intentional but keeps its lower-edge topology',()=>{
 const g=build('ach').children[0].geometry;
 assert.equal(g.userData.achMichCrownInset,.53);
 assert.ok(g.getAttribute('normal').count>0);
 const side=headwearCuboidVolumes('ach');
 assert.equal(side.length,5);
 assert.ok(Math.abs(lowerAt(side,4.4,0)-2.04)<.01);
});
