import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CUBE_HEAD_ANATOMY as A} from '../src/operator-head-anatomy.ts';
import {headwearCuboidVolumes,HEADWEAR_FIT_TARGETS,HEAD_SILHOUETTE_METRICS,
 createHeadwearSilhouette} from '../src/operator-headwear-silhouettes.ts';
const bottom=(volumes,x,z)=>{
 const hits=volumes.filter(v=>Math.abs(v.x-x)<=v.width/2+1e-6&&
  Math.abs(v.z-z)<=v.depth/2+1e-6);
 assert.ok(hits.length,'helmet needs some volume at '+x+','+z);
 return Math.min(...hits.map(v=>v.y-v.height/2));
};
test('fit landmarks reflect the unchanged 8-cube head, not new head geometry',()=>{
 assert.equal(A.skullTop-A.skullBottom,8);
 assert.equal(A.frontZ,-4);assert.equal(A.rearZ,4);
 assert.equal(A.rightX-A.leftX,8);
 assert.ok(A.skullTop>A.hairline&&A.hairline>A.brow);
 assert.ok(A.brow>A.earTop&&A.earTop>A.earCenter&&A.earCenter>A.earBottom);
});
test('ACH brow, ear cover, nape and crown are tied to head landmarks',()=>{
 const v=headwearCuboidVolumes('ach'),f=HEADWEAR_FIT_TARGETS.ach;
 assert.ok(Math.abs(bottom(v,0,-5)-f.brow)<.15);
 assert.ok(Math.abs(bottom(v,4.4,0)-f.ear)<.15);
 assert.ok(Math.abs(bottom(v,0,5)-f.nape)<.15);
 assert.ok(f.ear<A.earTop,'shell extends over real implied ear region');
 assert.ok(f.nape<=A.nape+.2,'rear drop protects lower rear skull');
 assert.ok(HEAD_SILHOUETTE_METRICS.ach.top-A.skullTop<2,
  'ACH top must not be perched far above the skull');
});
test('high-cut brow remains protective while central ear is open and rear returns',()=>{
 const v=headwearCuboidVolumes('high-cut');
 const fit=HEADWEAR_FIT_TARGETS['high-cut'];
 assert.ok(Math.abs(bottom(v,0,-5)-fit.brow)<.15);
 assert.ok(Math.abs(bottom(v,4.4,0)-fit.ear)<.15);
 assert.ok(Math.abs(bottom(v,0,5)-fit.nape)<.15);
 assert.ok(fit.ear-A.earTop>1.5,'true ear clearance');
 assert.ok(fit.nape<fit.ear-2,'rear returns downward behind cutout');
 assert.ok(fit.brow<A.hairline,'front brow sits BELOW the hairline');
 assert.ok(HEAD_SILHOUETTE_METRICS['high-cut'].top-A.skullTop<2);
});
test('matched ACH/high-cut 3/4 silhouettes retain overlap-free orthogonal joins',()=>{
 for(const id of ['ach','high-cut']){
  const model=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(model.children.length,1);
  const geometry=model.children[0].geometry;
  assert.equal(geometry.userData.greedyCuboidUnion,true);
  assert.ok(geometry.userData.exteriorQuads<150,
   'keep single efficient cuboid silhouette on mobile');
  assert.equal(model.children[0].receiveShadow,false);
  model.updateMatrixWorld(true);
  assert.ok(model.children[0].geometry.boundingBox.max.y<9.0);
 }
});
