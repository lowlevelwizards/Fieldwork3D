import test from 'node:test';
import assert from 'node:assert/strict';
import {
 PASGT_FABRIC_DENSITY,pasgtCamoWorldPeriod,pasgtCoverTexture
} from '../src/operator-pasgt-cover-texture.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod}
 from '../src/operator-fabric-camo-materials.ts';
import {
 PASGT_TOP_SEAM_OFFSETS,PASGT_UV_TEXELS_PER_UNIT,pasgtAtlasUv,
 PASGT_RING_SAMPLES,pasgtFabricCoordinate
} from '../src/operator-pasgt-drape-geometry.ts';
test('PASGT print density equals the approved uniform/gear fabric density',()=>{
 for(const id of ['m81-woodland','six-color-desert','three-color-desert','flecktarn']){
  assert.equal(PASGT_FABRIC_DENSITY[id],FABRIC_CAMO_DENSITY[id]);
  assert.equal(pasgtCamoWorldPeriod(id),fabricCamoWorldPeriod(id));
  const t=pasgtCoverTexture(id,'operator-a',0);
  assert.equal(t.image.width,256);
  assert.equal(t.image.height,256);
  assert.equal(t.channel,1);
 }
});
test('top and side atlas use one physical coordinate system',()=>{
 const sample=PASGT_RING_SAMPLES.find(s=>s.side==='front');
 const atTop=pasgtFabricCoordinate(sample,'top');
 const uv=pasgtAtlasUv(atTop);
 assert.ok(uv.every(x=>x>0&&x<1));
 assert.equal(PASGT_UV_TEXELS_PER_UNIT,7);
 const first=PASGT_TOP_SEAM_OFFSETS[0],second=PASGT_TOP_SEAM_OFFSETS[1];
 assert.ok(first<0&&second>0&&first===-second);
 assert.ok(Math.round(128+first*7)<128);
});
