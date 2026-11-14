import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {UNIFIED_HELMET_HEMS} from '../src/operator-ach-mich-unified-shell.ts';
import {CUBE_HEAD_ANATOMY} from '../src/operator-head-anatomy.ts';
import {createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
import {achMichHemY,achMichProfile,achMichBindingHeight,
 createAchMichBindingGeometry,achMichRetentionPaths}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';
import {createHelmetAnatomyGuide,HELMET_ANATOMY_GUIDE_NAME}
 from '../src/operator-helmet-anatomy-guide.ts';
const near=(a,b,eps=.002)=>Math.abs(a-b)<=eps;
const xyz=(attr,i)=>[attr.getX(i),attr.getY(i),attr.getZ(i)];
const same=(a,b)=>a.every((x,i)=>near(x,b[i]));

test('H23: ear-zone slope begins around 40%, and the opening clears the implied ear',()=>{
 for(const id of ['ach','mich-2002','mich-2001']){
  const hem=UNIFIED_HELMET_HEMS[id],front=hem[0][2],rear=hem[5][2];
  assert.equal(hem.length,6);
  // The heavy temple now reaches about 40% from the face; the full
  // ear-cut height only begins around halfway down the shell.
  const startFraction=(hem[1][2]-front)/(rear-front);
  const earFraction=(hem[2][2]-front)/(rear-front);
  assert.ok(startFraction>.38 && startFraction<.45,id+' front-of-ear slope');
  assert.ok(earFraction>.48 && earFraction<.53,id+' ear opening begins near halfway');
  assert.ok(hem[2][2]<CUBE_HEAD_ANATOMY.earZ &&
   hem[3][2]>CUBE_HEAD_ANATOMY.earZ,
   id+' the ear opening contains the anatomical ear marker');
  assert.ok(hem[3][2]-hem[2][2]>=2.4);
  for(let i=1;i<hem.length;i++)
   assert.ok(hem[i][2]>hem[i-1][2],'six increasing, unmangled stations');
 }
});
test('H23: lower nape profiles protect the back while ear heights remain distinct',()=>{
 const [f,m,h]=['ach','mich-2002','mich-2001'].map(id=>UNIFIED_HELMET_HEMS[id]);
 assert.deepEqual([f[2][1],m[2][1],h[2][1]],[2.04,3.06,5.30]);
 assert.deepEqual([f[5][1],m[5][1],h[5][1]],[1.85,1.90,2.05]);
 assert.ok(f[3][1]-f[5][1]>=.15 && f[3][1]-f[5][1]<=.25,
  'Full-Cut nape gently descends from the ear rather than rising');
 assert.ok(m[3][1]-m[5][1]>=1,'Mid-Cut rear is below partial ear relief');
 assert.ok(h[3][1]-h[5][1]>=3,'High-Cut keeps iconic ear opening');
 assert.ok(m[4][2]>m[3][2]+1.5&&h[4][2]>h[3][2]+1.5,
  'broad rear diagonals; no tiny hanging tail');
});
test('H22: front/rear binding corners now share endpoints with each side strip',()=>{
 for(const id of ['ach','mich-2002','mich-2001']){
  const g=createAchMichBindingGeometry(id),p=achMichProfile(id);
  const verts=g.getAttribute('position');
  assert.equal(g.userData.segmentCount,12);
  assert.equal(verts.count,72);
  const frontLeft=xyz(verts,0),frontRight=xyz(verts,1);
  const rearRight=xyz(verts,6),rearLeft=xyz(verts,7);
  assert.ok(same(frontLeft,xyz(verts,12)),id+' left front meets side');
  assert.ok(same(frontRight,xyz(verts,42)),id+' right front meets side');
  assert.ok(same(rearLeft,xyz(verts,37)),id+' left rear meets side');
  assert.ok(same(rearRight,xyz(verts,67)),id+' right rear meets side');
  const ext=id==='mich-2001'?.095:.16;
  assert.ok(near(Math.abs(frontLeft[0]),p.side+ext));
  assert.ok(near(frontLeft[2],p.front-ext));
  assert.ok(near(rearLeft[2],p.rear+ext));
  assert.ok(near(g.userData.minimumHeight,achMichBindingHeight(id)));
  const shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(shell.children.length,1);
  assert.equal(shell.children[0].geometry.index.count,id==='mich-2001'?234:354);
  assert.equal(shell.children[0].geometry.userData.exteriorQuads,id==='mich-2001'?39:59);
  const cover=createAchMichDrapedGeometry(id);
  assert.ok(cover.boundingBox.max.y>shell.children[0].geometry.boundingBox.max.y);
  assert.ok(near(achMichProfile(id).nape,UNIFIED_HELMET_HEMS[id][5][1]));
  for(const stud of [p.frontStud,p.rearStud])
   assert.ok(near(stud[1]-achMichHemY(id,stud[2]),
      achMichBindingHeight(id)+.45,.15),
    id+' retention hardware should follow new silhouette');
  assert.equal(achMichRetentionPaths(id).length,6);
 }
});
test('H22: opt-in Studio anatomy guide is purely visual and head-relative',()=>{
 const guide=createHelmetAnatomyGuide();
 assert.equal(guide.name,HELMET_ANATOMY_GUIDE_NAME);
 assert.equal(guide.userData.debugOnly,true);
 assert.equal(guide.children.length,1);
 assert.ok(guide.children[0] instanceof THREE.LineSegments);
 assert.equal(guide.children[0].geometry.getAttribute('position').count,20);
 guide.children[0].geometry.computeBoundingBox();
 assert.ok(near(guide.children[0].geometry.boundingBox.min.y,1.35));
 assert.ok(near(guide.children[0].geometry.boundingBox.max.y,4.0));
 const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.match(studio,/params.get\('helmetAnatomy'\)==='1'/);
 assert.match(studio,/rig.headCanonicalFrame.add\(createHelmetAnatomyGuide\(\)\)/);
 const rig=readFileSync(new URL('../src/breach-operator-rig.ts',import.meta.url),'utf8');
 assert.doesNotMatch(rig,/helmetAnatomy|createHelmetAnatomyGuide/);
});
