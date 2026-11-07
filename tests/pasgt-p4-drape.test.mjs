import test from 'node:test';
import assert from 'node:assert/strict';
import {
 createPasgtDrapedGeometry,createPasgtBandGeometry,PASGT_RING_SAMPLES,
 PASGT_RING_CIRCUMFERENCE,PASGT_TOP_SEAM_OFFSETS,PASGT_CAMO_SCALE,
 pasgtRingPoint,PASGT_SLIT_ANCHORS
} from '../src/operator-pasgt-drape-geometry.ts';
import {pasgtCoverTexture} from '../src/operator-pasgt-cover-texture.ts';
import {headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
test('new cloth uses planar diagonal bridges, keeps unchanged PASGT shell',()=>{
 const shell=headwearCuboidVolumes('pasgt');
 assert.equal(shell[0].name,'pasgt-single-protective-crown');
 assert.equal(shell[1].name,'pasgt-integrated-front-peak');
 const sample=PASGT_RING_SAMPLES.find(x=>x.side==='front');
 const shoulder=pasgtRingPoint(sample,'shoulder'),ramp=pasgtRingPoint(sample,'ramp');
 assert.ok(shoulder[2]>ramp[2]+1);
 assert.ok(shoulder[1]>ramp[1]);
 const g=createPasgtDrapedGeometry();
 assert.equal(g.userData.pasgtDrapedFabric,true);
 assert.equal(g.getAttribute('uv1').count,g.getAttribute('position').count);
 assert.deepEqual(g.userData.topSeams,[-2.6,2.6]);
 assert.ok(g.boundingBox.max.y>8.9);
 assert.ok(g.boundingBox.min.y>1.8);
 const hem=createPasgtDrapedGeometry(true);
 assert.ok(hem.getAttribute('position').count>0);
 assert.ok(hem.getAttribute('uv1'));
});
test('print is denser and physically consistent between top and sides',()=>{
 assert.equal(PASGT_CAMO_SCALE,1);
 assert.ok(PASGT_RING_CIRCUMFERENCE>35&&PASGT_RING_CIRCUMFERENCE<47);
 const tex=pasgtCoverTexture('m81-woodland','operator',1);
 assert.equal(tex.channel,1);
 assert.equal(tex.image.width,256);
 assert.equal(tex.image.height,256);
 const left=Math.round(30+5*(PASGT_TOP_SEAM_OFFSETS[0]+5.275));
 const right=Math.round(30+5*(PASGT_TOP_SEAM_OFFSETS[1]+5.275));
 assert.ok(left<right&&left>0&&right<128);
 // The center column isn't sewn; the twin seams are.
 assert.ok(left<57&&right>57);
});
test('eight field anchors all have distinct names and locations',()=>{
 assert.equal(PASGT_SLIT_ANCHORS.length,8);
 assert.equal(new Set(PASGT_SLIT_ANCHORS.map(a=>a.id)).size,8);
 const band=createPasgtBandGeometry();
 assert.ok(band.boundingBox.max.y<6&&band.boundingBox.min.y>5.1);
});
