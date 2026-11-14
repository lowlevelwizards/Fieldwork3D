import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ACH_MICH_SHELLS,headwearCuboidVolumes,HEAD_SILHOUETTE_METRICS,
 createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,achMichHemY,createAchMichBindingGeometry,
 achMichRetentionPaths} from '../src/operator-ach-mich-details.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';
import {HELMET_MOUNT_PROFILES}
 from '../src/operator-helmet-attachment-frames.ts';

const near=(a,b)=>Math.abs(a-b)<.001;
const bottom=(v,x,z)=>Math.min(...v.filter(p=>
 Math.abs(p.x-x)<=p.width/2+.00001 &&
 Math.abs(p.z-z)<=p.depth/2+.00001)
 .map(p=>p.y-p.height/2));

test('H16: silhouette hierarchy is legible without accessories',()=>{
 const full=headwearCuboidVolumes('ach'),
  mid=headwearCuboidVolumes('mich-2002'),
  high=headwearCuboidVolumes('mich-2001');
 const fullEar=bottom(full,4.4,0),midEar=bottom(mid,4.4,0),
  highEar=bottom(high,4.4,0);
 assert.ok(near(fullEar,2.31));
 assert.ok(near(midEar,2.99));
 assert.ok(highEar>5.9);
 assert.ok(fullEar<midEar-.5&&midEar<highEar-2.5);
 assert.ok(near(bottom(full,0,5),2.55));
 assert.ok(near(bottom(mid,0,5),3.21));
 assert.ok(fullEar<bottom(full,0,5)-.20,'full ear lobe below nape');
 assert.ok(midEar<bottom(mid,0,5)-.20,'mid ear lobe below nape');
 for(const [v,label,depth] of [[full,'ach',5.30],
  [mid,'m2002',5.33]]){
  const pair=v.filter(p=>p.name.includes(label==='ach'?'ear-wrap':'ear-guard'));
  assert.equal(pair.length,2,'one broad ear guard per side');
  assert.ok(pair.every(p=>Math.abs(p.x)+p.width/2>=depth));
  assert.ok(pair[0].x===-pair[1].x);
  assert.ok(pair.every(p=>p.depth>4.7),'no micro-detail ear stairs');
 }
 assert.ok(near(HEAD_SILHOUETTE_METRICS.ach.earEdge,fullEar));
 assert.ok(near(HEAD_SILHOUETTE_METRICS['mich-2002'].earEdge,midEar));
 assert.equal(HELMET_MOUNT_PROFILES['mich-2002'].ear,4.05,
  'upper sidewall accessory station must not drop with the guard');
 assert.equal(HELMET_MOUNT_PROFILES.ach.ear,2.92,
  'full-cut mount station stays at its established height');
});

test('H16: cover, edge binding and webbing follow the same new lower profile',()=>{
 for(const id of ACH_MICH_SHELLS){
  const p=achMichProfile(id),edge=createAchMichBindingGeometry(id),
   cover=createAchMichDrapedGeometry(id),
   straps=achMichRetentionPaths(id);
  assert.ok(edge.boundingBox&&cover.boundingBox);
  assert.ok(edge.getAttribute('position').count<150);
  assert.equal(straps.length,6);
  assert.ok(near(achMichHemY(id,0),
   id==='ach'?2.31:id==='mich-2002'?2.99:6.155));
  assert.ok(near(edge.boundingBox.min.y,
   id==='ach'?2.31:id==='mich-2002'?2.99:3.33));
  assert.ok(cover.boundingBox.max.y>headwearCuboidVolumes(id)[0].y+
   headwearCuboidVolumes(id)[0].height/2);
  if(id!=='mich-2001')assert.ok(p.hem.some(point=>point[0]>p.side+.2),
   'side guard protrusion must also exist in the material hem');
 }
});

test('H16: added mid guard retains a single cheap joined shell; crown unchanged',()=>{
 const full=headwearCuboidVolumes('ach'),
  mid=headwearCuboidVolumes('mich-2002');
 assert.equal(full.length,9,'Full-Cut remains nine broad cuboids');
 assert.equal(mid.length,9,'Mid-Cut adds only one cuboid per ear');
 assert.ok(near(full[0].y+full[0].height/2,8.84));
 assert.ok(near(mid[0].y+mid[0].height/2,8.75));
 for(const id of ACH_MICH_SHELLS){
  const g=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(g.children.length,1);
  assert.equal(g.children[0].geometry.userData.greedyCuboidUnion,true);
  assert.ok(g.children[0].geometry.userData.exteriorQuads<180);
 }
});
