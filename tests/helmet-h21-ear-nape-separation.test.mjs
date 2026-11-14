import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {UNIFIED_HELMET_HEMS} from '../src/operator-ach-mich-unified-shell.ts';
import {createHeadwearSilhouette,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,achMichHemY,achMichBindingHeight,
 createAchMichBindingGeometry,achMichRetentionPaths}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';
const near=(a,b,e=.003)=>Math.abs(a-b)<=e;

test('H21: ear cut is independent of rear protection across the three cuts',()=>{
 const full=UNIFIED_HELMET_HEMS.ach,
  mid=UNIFIED_HELMET_HEMS['mich-2002'],
  high=UNIFIED_HELMET_HEMS['mich-2001'];
 assert.deepEqual(full.map(p=>[p[1],p[2]]),[
  [4.4,-5.535],[4.4,-1.12],[2.04,-0.12],
  [2.04,2.35],[1.85,3.88],[1.85,5.60]
 ],'Full-Cut ear remains deep with a slightly descending nape');
 assert.deepEqual(mid.map(p=>[p[1],p[2]]),[
  [4.55,-5.70],[4.55,-0.78],[3.06,0.10],
  [3.06,2.52],[1.90,4.08],[1.90,5.75]
 ],'Mid-Cut ear relief starts near halfway and nape stays deep');
 assert.deepEqual(high.map(p=>[p[1],p[2]]),[
  [4.55,-5.71],[4.55,-0.80],[5.30,0.10],
  [5.30,2.52],[2.05,4.08],[2.05,5.66]
 ],'High-Cut over-ear clearance remains large with deep nape');
 const hems=[full,mid,high];
 for(const p of hems){
  assert.equal(p.length,6);
  for(let i=1;i<p.length;i++)
   assert.ok(p[i][2]>p[i-1][2],'no added tiny turns or discontinuities');
  assert.ok(p.every(v=>v[0]>=p[0][0]&&v[0]<=p[0][0]+.3),
   'one continuous varying side width, not an added side plate');
  assert.ok(near(p[4][1],p[5][1]),'rear is a continuous nape, not a separate plate');
 }
 assert.ok(mid[4][1]<mid[3][1],'Mid-Cut rear MUST descend behind the ear');
 assert.ok(high[4][1]<high[3][1]-2,'High-Cut ear MUST be open with rear protection');
 assert.ok(full[5][1]<mid[5][1]&&mid[5][1]<high[5][1]);
 assert.ok(high[5][1]-full[5][1]<=.51,
  'all three retain comparable nape coverage while ears differ strongly');
 assert.ok(high[2][1]-mid[2][1]>2.2,'different iconic ear clearances');
});

test('H21: static unified shells, shared cover and rubber edge',()=>{
 for(const id of ['ach','mich-2002','mich-2001']){
  const group=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(group.children.length,1,'one shell mesh for '+id);
  const geom=group.children[0].geometry;
  assert.equal(geom.userData.exteriorQuads,39,'one midwall shoulder row for '+id);
  assert.equal(geom.index.count,234,'78 triangles for '+id);
  assert.equal(headwearCuboidVolumes(id).length,5,'no stacked guard plates');
  const p=achMichProfile(id),hem=UNIFIED_HELMET_HEMS[id];
  assert.equal(p.hem,hem,'one contour drives shell, cover, rubber edge');
  assert.ok(near(p.nape,hem.at(-1)[1]));
  assert.ok(near(geom.boundingBox.min.y,Math.min(...hem.map(v=>v[1]))));
  const trim=createAchMichBindingGeometry(id),
   cover=createAchMichDrapedGeometry(id),
   paths=achMichRetentionPaths(id);
  assert.equal(trim.userData.segmentCount,12);
  assert.ok(near(trim.userData.minimumHeight,achMichBindingHeight(id)));
  assert.ok(near(trim.boundingBox.min.y,Math.min(...hem.map(v=>v[1]))));
  assert.equal(paths.length,6);
  assert.ok(cover.boundingBox.max.y>=geom.boundingBox.max.y);
  // The cover's lower rear seam must meet the new rim, not H20's old rear.
  const expected=p.nape+achMichBindingHeight(id)+.035;
  const pos=cover.getAttribute('position');
  let rearSeamVertex=false;
  for(let i=0;i<pos.count;i++){
   if(near(pos.getY(i),expected,.004)&&pos.getZ(i)>p.rear-.12){
    rearSeamVertex=true;break;
   }
  }
  assert.ok(rearSeamVertex,'cover hem follows rear return: '+id);
  for(const stud of [p.frontStud,p.rearStud])
   assert.ok(near(stud[1]-achMichHemY(id,stud[2]),
      achMichBindingHeight(id)+.45,.15),
    'fastener follows contour rather than floating behind it: '+id);
  for(const path of paths)
   assert.ok(path[0][1]<achMichHemY(id,path[0][2])-.10,
    'webbing enters from just under the shell edge: '+id);
 }
});
