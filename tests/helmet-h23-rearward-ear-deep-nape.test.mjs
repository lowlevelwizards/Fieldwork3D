import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CUBE_HEAD_ANATOMY as HEAD} from '../src/operator-head-anatomy.ts';
import {UNIFIED_HELMET_HEMS} from '../src/operator-ach-mich-unified-shell.ts';
import {achMichProfile,achMichHemY,achMichRetentionPaths,
 createAchMichBindingGeometry,achMichBindingHeight}
 from '../src/operator-ach-mich-details.ts';
import {createHeadwearSilhouette,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';
import {createAchMichDrapedGeometry}
 from '../src/operator-ach-mich-cover-drape.ts';
const cuts=['ach','mich-2002','mich-2001'];
const close=(a,b,eps=.005)=>Math.abs(a-b)<eps;
const point=(a,i)=>[a.getX(i),a.getY(i),a.getZ(i)];
const same=(a,b)=>a.every((v,i)=>close(v,b[i]));

test('H23: forward ear drop begins near 40% and reaches true ear depth halfway',()=>{
 for(const id of cuts){
  const hem=UNIFIED_HELMET_HEMS[id],front=hem[0][2],rear=hem[5][2],
   fraction=z=>(z-front)/(rear-front);
  assert.equal(hem.length,6,'no silhouette tessellation');
  assert.ok(fraction(hem[1][2])>.38 && fraction(hem[1][2])<.45,
   id+' temple continues further back before dropping');
  assert.ok(fraction(hem[2][2])>.48 && fraction(hem[2][2])<.53,
   id+' ear depth starts near middle of skull');
  assert.ok(hem[2][2]<HEAD.earZ && hem[3][2]>HEAD.earZ,
   'symbolic ear remains beneath the correct coverage/opening');
  assert.ok(hem[3][2]-hem[2][2]>=2.4,
   'keep a broad chunky ear section, not a thin dangling notch');
  for(let i=1;i<6;i++)assert.ok(hem[i][2]>hem[i-1][2]);
 }
});
test('H23: nape spans around skull nape, lower but distinct among cuts',()=>{
 const f=UNIFIED_HELMET_HEMS.ach,m=UNIFIED_HELMET_HEMS['mich-2002'],
  h=UNIFIED_HELMET_HEMS['mich-2001'];
 assert.deepEqual([f[2][1],m[2][1],h[2][1]],[2.04,3.06,5.30]);
 assert.deepEqual([f[5][1],m[5][1],h[5][1]],[1.85,1.90,2.05]);
 assert.ok(f[5][1]<HEAD.nape,'Full covers just below nape landmark');
 assert.ok(m[5][1]<HEAD.nape,'Mid wraps down to nape');
 assert.ok(h[5][1]<=HEAD.nape+.05,'High shields nape despite open ears');
 assert.ok(f[5][1]<f[3][1],
  'Full-Cut follows ear floor gently down, not up');
 assert.ok(m[5][1]<m[3][1]-1,
  'Mid-Cut nape drops visibly below partial ear rim');
 assert.ok(h[5][1]<h[3][1]-3,
  'High-Cut notch remains clearly open above ear');
 for(const hem of [f,m,h])assert.ok(hem[4][1]===hem[5][1],
  'each cut retains continuous flat protective nape');
});
test('H23: shell, cover, edge and hardware share the six profile stations',()=>{
 for(const id of cuts){
  const hem=UNIFIED_HELMET_HEMS[id],p=achMichProfile(id);
  assert.equal(p.hem,hem);
  assert.ok(close(p.brow,hem[0][1]));
  assert.ok(close(p.nape,hem[5][1]));
  assert.ok(close(p.frontStud[2],hem[1][2]-.32),
   'front screw tracks actual relocated temple station');
  assert.ok(close(p.rearStud[1],p.nape+achMichBindingHeight(id)+.45),
   'rear screw tracks actual nape Y');
  for(const stud of [p.frontStud,p.rearStud])
   assert.ok(stud[1]>achMichHemY(id,stud[2])+.53,
    'fastener must not intersect lower edge');
  for(const strap of achMichRetentionPaths(id))
   assert.ok(strap[0][1]<achMichHemY(id,strap[0][2])-.10,
    'tucked behind shell, not exposed on sidewall');
  const shell=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  const g=shell.children[0].geometry;
  assert.equal(shell.children.length,1);
  assert.equal(g.userData.exteriorQuads,39);
  assert.equal(g.index.count,234,'same 78 triangles');
  assert.ok(close(g.boundingBox.min.y,Math.min(...hem.map(p=>p[1]))));
  const edge=createAchMichBindingGeometry(id),e=edge.getAttribute('position');
  assert.equal(edge.userData.segmentCount,12);
  assert.equal(e.count,72,'same 24 edge triangles');
  assert.ok(close(edge.boundingBox.min.y,g.boundingBox.min.y));
  assert.ok(close(edge.userData.minimumHeight,achMichBindingHeight(id)));
  for(const [a,b] of [[0,12],[1,42],[7,37],[6,67]])
   assert.ok(same(point(e,a),point(e,b)),
    'corner is watertight, not two crossing trim slivers');
  const cover=createAchMichDrapedGeometry(id),v=cover.getAttribute('position');
  const rearSeamY=p.nape+achMichBindingHeight(id)+.035;
  let rearSeam=false;
  for(let i=0;i<v.count;i++)if(close(v.getY(i),rearSeamY,.004)&&
   v.getZ(i)>p.rear-.15){rearSeam=true;break;}
  assert.ok(rearSeam,'rear textile follows lower protective nape');
  const fit=headwearCuboidVolumes(id);
  assert.equal(fit.length,5,'unchanged fitting volume count');
  for(const volume of fit.filter(v=>v.name.includes('ear-nape'))){
   assert.ok(volume.z-volume.depth/2>-.45,
    'coarse fitted ear volume no longer extends into front temple');
   assert.ok(volume.z+volume.depth/2>3.75);
  }
 }
});
