import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CUBE_HEAD_ANATOMY as A} from '../src/operator-head-anatomy.ts';
import {HEAD_SILHOUETTE_METRICS,headwearCuboidVolumes,
 createHeadwearSilhouette,ACH_MICH_BEVEL_HEIGHT,ACH_MICH_UPPER_INSET}
 from '../src/operator-headwear-silhouettes.ts';
import {UNIFIED_HELMET_HEMS} from '../src/operator-ach-mich-unified-shell.ts';
import {achMichProfile,achMichHemY,achMichBindingHeight,
 createAchMichBindingGeometry,achMichRetentionPaths}
 from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';
import {HELMET_MOUNT_PROFILES}
 from '../src/operator-helmet-attachment-frames.ts';

const near=(a,b,e=.002)=>Math.abs(a-b)<e;

test('H19: implied cube face landmarks are ordered without adding mesh geometry',()=>{
 assert.equal(A.skullTop,7);
 assert.equal(A.skullBottom,-1);
 assert.equal(A.frontZ,-4);
 assert.equal(A.rearZ,4);
 assert.ok(A.hairline>A.brow&&A.brow>A.eyeCenter);
 assert.ok(A.eyeCenter>A.noseBase&&A.noseBase>A.mouth);
 assert.ok(A.earTop>A.earCenter&&A.earCenter>A.earBottom);
 assert.ok(A.earZ>0&&A.earZ<A.rearZ,'ears are just behind center');
});

test('H20: High-Cut over-ear arch is distinct and rear remains seated',()=>{
 const high=UNIFIED_HELMET_HEMS['mich-2001'];
 assert.equal(high.length,6,'six continuous perimeter stations');
 assert.ok(high.every(p=>near(p[0],5.015)));
 for(let i=1;i<high.length;i++)
  assert.ok(high[i][2]-high[i-1][2]>.7,'single ordered outline, no tiny tabs');
 assert.ok(near(high[0][1],4.55)&&near(high[1][1],4.55));
 assert.ok(near(high[2][1],high[3][1])&&near(high[2][1],5.30));
 assert.ok(near(high[4][1],high[5][1])&&near(high[5][1],2.85));
 assert.ok(high[2][1]>A.earTop+1.1 &&
  high[2][1]<A.hairline,'side clears upper ear but remains below hairline');
 assert.ok(high[4][1]<A.earTop-0.7 &&
  high[4][1]>UNIFIED_HELMET_HEMS.ach[5][1],
  'nape extends lower behind ear while Full-Cut remains deepest');
 assert.ok(high[1][2]<A.earZ&&high[4][2]>A.earZ);
 assert.equal(achMichProfile('mich-2001').hem,high);
 assert.equal(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge,5.30);
 assert.ok(achMichHemY('mich-2001',A.earZ)>A.earTop+.5);
 assert.ok(near(achMichHemY('mich-2001',4.6),2.85),
  'H22 retains the lowered rear nape behind the open ear');
 assert.ok(UNIFIED_HELMET_HEMS['mich-2002'][2][1]<high[2][1]-1.6);
 assert.ok(UNIFIED_HELMET_HEMS.ach[2][1]<high[2][1]-2.5);
 assert.equal(HELMET_MOUNT_PROFILES['mich-2001'].ear,5.91,
  'rail socket height is not the shell lower edge');
});

test('H19: no stacked exterior panels, same one-draw low-poly shell',()=>{
 const fitting=headwearCuboidVolumes('mich-2001');
 assert.equal(fitting.length,5);
 assert.equal(fitting.filter(p=>p.name.includes('ear-nape')).length,2);
 assert.equal(fitting.filter(p=>/short-temple|rear-return/.test(p.name)).length,0);
 const shell=createHeadwearSilhouette('mich-2001',new THREE.MeshStandardMaterial());
 assert.equal(shell.children.length,1);
 const geom=shell.children[0].geometry;
 assert.equal(geom.userData.h17UnifiedContour,true);
 assert.equal(geom.userData.exteriorQuads,29);
 assert.equal(geom.index.count,174,'58 shell triangles');
 assert.equal(geom.getAttribute('position').count,174);
 assert.ok(near(geom.boundingBox.max.y,8.705));
 assert.ok(near(geom.boundingBox.min.y,2.85));
 assert.equal(geom.userData.achMichCrownInset,ACH_MICH_UPPER_INSET);
 assert.equal(geom.userData.achMichBevelHeight,ACH_MICH_BEVEL_HEIGHT);
 assert.ok(geom.getAttribute('uv1').count>0);
});

test('H19: narrow rubber edge follows one shell/cover perimeter',()=>{
 const id='mich-2001',p=achMichProfile(id);
 assert.ok(near(achMichBindingHeight(id),.42));
 assert.ok(near(achMichBindingHeight('ach'),.52));
 assert.ok(near(achMichBindingHeight('mich-2002'),.52));
 const binding=createAchMichBindingGeometry(id);
 const pos=binding.getAttribute('position');
 assert.equal(binding.userData.segmentCount,12);
 assert.equal(pos.count,72);
 let maxSide=0;
 for(let i=0;i<pos.count;i++)maxSide=Math.max(maxSide,Math.abs(pos.getX(i)));
 assert.ok(maxSide<=p.side+.10,'no offset thick floating rim or side tabs');
 assert.ok(near(binding.boundingBox.min.y,2.85));
 const cover=createAchMichDrapedGeometry(id);
 assert.ok(cover.boundingBox.max.y>8.705);
 assert.ok(cover.userData.h71JoinedCoverCorners);
 assert.equal(cover.userData.achMichShell,id);
 assert.equal(achMichRetentionPaths(id).length,6);
 for(const stud of [p.frontStud,p.rearStud])
  assert.ok(stud[1]>achMichHemY(id,stud[2])+.4,
   'retention bolts clear the new rubber binding');
});
