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
test('headwear remains entirely orthogonal and patrol cap retains short flat bill',()=>{
 const cap=build('patrol-cap');
 assert.equal(cap.children.length,6);
 for(const mesh of cap.children)assert.equal(mesh.geometry.type,'BoxGeometry');
 const bill=cap.children.find(x=>x.name==='flat-short-bill');
 const crown=cap.children.find(x=>x.name==='soft-flat-crown');
 assert.ok(bill&&crown);
 assert.ok(box(bill).min.z<box(crown).min.z-2);
 assert.ok(box(cap).max.y<9.1);
});
test('two helmet families render single joined faceless-interior cuboid exterior',()=>{
 for(const id of ['ach','high-cut']){
  const g=build(id);
  assert.equal(g.children.length,1,id);
  assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  const geometry=g.children[0].geometry;
  assert.equal(geometry.type,'BufferGeometry');
  assert.ok(geometry.userData.greedyCuboidUnion);
  assert.equal(geometry.userData.cuboids.length,
    headwearCuboidVolumes(id).length);
  assert.ok(geometry.index.count>=36);
  for(const n of geometry.getAttribute('position').array)
   assert.ok(Number.isFinite(n));
  const normals=geometry.getAttribute('normal');
  for(let i=0;i<normals.count;i++){
   const v=[normals.getX(i),normals.getY(i),normals.getZ(i)];
   assert.ok(v.filter(n=>Math.abs(n)>1-1e-5).length===1,
    'every face must be an orthogonal rectangle, never curved');
  }
  assert.equal(g.children[0].receiveShadow,false);
 }
});
test('ACH uses one decisive side drop instead of narrow stepping',()=>{
 const v=headwearCuboidVolumes('ach');
 const brow=byName(v,'ach-protective-brow'),ear=byName(v,'ach-right-ear-wrap');
 assert.ok(brow&&ear);
 assert.ok(lowerAt(v,4.4,0)<2.4,'ACH extends through implied ear center');
 assert.ok(lowerAt(v,4.4,-3)<6,'temple descends from brow');
 assert.ok(lowerAt(v,0,-5)<4.6,'front edge is near implied brow');
 assert.ok(lowerAt(v,0,4.95)<2.4,'protective lower rear skull');
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
  assert.ok(b.min.y>=2.1&&b.max.y<9.0);
 }
});

test('stage 1E removes insignificant crown trim and consolidates silhouette steps',()=>{
 const ach=headwearCuboidVolumes('ach');
 const high=headwearCuboidVolumes('high-cut');
 assert.equal(ach.length,7,'ACH: crown, brow, nape and two broad side pairs');
 assert.equal(high.length,5,'high-cut: crown, brow, rear and two temple returns');
 for(const [id,v] of [['ach',ach],['high-cut',high]]){
  assert.ok(v.every(p=>p.height>=1.7),
   id+' must not add little upper strips or narrow silhouette risers');
  assert.ok(v.every(p=>p.width>=.96&&p.depth>=1.26),
   id+' must use substantial deliberate masses');
  assert.ok(!v.some(p=>/step|trim|ridge|plate/i.test(p.name)),
   id+' should contain no decorative staircase');
  assert.equal(build(id).userData.stage,'1E');
 }
 // The ACH side is two intentional plateaus; ear and nape share a bottom.
 assert.ok(Math.abs(lowerAt(ach,4.4,-3.5)-4.40)<.01);
 assert.ok(Math.abs(lowerAt(ach,4.4,0)-2.23)<.01);
 assert.ok(Math.abs(lowerAt(ach,4.4,4.6)-2.23)<.01);
 // The high-cut instead has exactly one broad, exposed ear interval.
 assert.ok(Math.abs(lowerAt(high,4.4,-3.5)-4.50)<.01);
 assert.ok(Math.abs(lowerAt(high,4.4,0)-5.95)<.01);
 assert.ok(Math.abs(lowerAt(high,4.4,3.5)-3.10)<.01);
});
