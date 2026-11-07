import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createPasgtDrapedGeometry,PASGT_RING_SAMPLES,pasgtRingPoint,
 pasgtFabricCoordinate,pasgtAtlasUv,PASGT_RING_CIRCUMFERENCE
} from '../src/operator-pasgt-drape-geometry.ts';
import {headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
test('P5-A leaves source PASGT shell as approved and narrows the ear hem drop',()=>{
 const shell=headwearCuboidVolumes('pasgt');
 assert.equal(shell[0].name,'pasgt-single-protective-crown');
 assert.equal(shell[1].name,'pasgt-integrated-front-peak');
 const side=PASGT_RING_SAMPLES.filter(p=>p.side==='right');
 const high=side.find(p=>p.z===-1.7),low=side.find(p=>p.z===-.78);
 assert.ok(high.bottomY>4&&low.bottomY<2.1);
 assert.ok(Math.abs(high.z-low.z)<1);
 const head=createPasgtDrapedGeometry();
 assert.equal(head.userData.pasgtUvLayout,'common-unfolded-crown-side-fabric');
 assert.equal(head.getAttribute('uv1').count,head.getAttribute('position').count);
 assert.ok(head.boundingBox.max.y>8.85);
 const hem=createPasgtDrapedGeometry(true);
 assert.ok(hem.getAttribute('position').count>0);
});
test('crown and side UV coordinates meet on same physical fabric edge',()=>{
 for(const side of ['front','right','rear','left']){
  const sample=PASGT_RING_SAMPLES.find(s=>s.side===side);
  const top=pasgtRingPoint(sample,'top');
  const p=pasgtFabricCoordinate(sample,'top');
  assert.ok(Math.abs(p[0]-top[0])<1e-6);
  assert.ok(Math.abs(p[1]-top[2])<1e-6);
  const u=pasgtAtlasUv(p);
  assert.ok(u.every(v=>v>0&&v<1));
 }
 assert.ok(PASGT_RING_CIRCUMFERENCE>35&&PASGT_RING_CIRCUMFERENCE<47);
});
