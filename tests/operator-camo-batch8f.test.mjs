import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,headwearCamoCoverage,
 headwearCamoIndices,headwearCamoPixels,headwearCamoPlacement,headwearCamoSize}
 from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod,wardrobeFabricCamoTexture}
 from '../src/operator-fabric-camo-materials.ts';
const S2000_8E_RGBA_SHA='4cd092f87a82a262c5ed78d5436f5e5725ab0a0cac8dc832adebd1f991505bb9';
const M98_8E_RGBA_SHA='f564112ff59b3e1db28a1f4a5e88e12dcfe253e25313746f54067efc1efca1df';
const rgbaHash=id=>createHash('sha256').update(headwearCamoPixels(id)).digest('hex');
function cropMax(tile,width,height){
 let maximum=0;
 for(let sy=0;sy<64;sy++)for(let sx=0;sx<64;sx++){
  const counts=[0,0,0];
  for(let dy=0;dy<height;dy++)for(let dx=0;dx<width;dx++){
   const index=((sy+dy)&63)*64+((sx+dx)&63);
   counts[tile[index]]++;
  }
  maximum=Math.max(maximum,...counts);
 }
 return maximum/(width*height);
}
function boundaries(tile){
 let count=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const v=tile[y*64+x];
  if(v!==tile[y*64+((x+1)&63)])count++;
  if(v!==tile[((y+1)&63)*64+x])count++;
 }
 return count;
}
test('M98 8F-to-8G master retains curved medium-scale breakup across narrow garments',()=>{
 const id='norwegian-m98',tile=headwearCamoIndices(id);
 const coverage=headwearCamoCoverage(id);
 assert.equal(tile.length,4096);
 assert.equal(new Set(tile).size,3);
 assert.equal(headwearCamoSize(id),64);
 assert.equal(HEADWEAR_CAMO_RECIPES[id].colors.length,3);
 assert.notEqual(rgbaHash(id),M98_8E_RGBA_SHA,'8F must actually change the 8E blob master');
 for(const part of coverage)
  assert.ok(part>.27&&part<.41,'all three colors remain significant');
 const maxCrop=cropMax(tile,12,18);
 console.log('8F M98 small-garment crop max',+maxCrop.toFixed(3));
 assert.ok(maxCrop<.985,'12×18 garment cut cannot be a fully solid field');
 // Maintain a bold disruptive identity: neither noisy little dots
 // nor the straight and oversized polygons of the 8E version.
 const edge=boundaries(tile);
 assert.ok(edge>650&&edge<1450,'organic medium lobes, not speckle or giant fields');
 assert.equal(FABRIC_CAMO_DENSITY[id],3.0);
 assert.ok(fabricCamoWorldPeriod(id)>21&&fabricCamoWorldPeriod(id)<22);
});
test('8F JGSDF stays fleck-dense with quieter rust and khaki',()=>{
 const id='jgsdf-type2',tile=headwearCamoIndices(id);
 const cov=headwearCamoCoverage(id),palette=HEADWEAR_CAMO_RECIPES[id].colors;
 assert.deepEqual(palette[2],[127,96,84]);
 assert.deepEqual(palette[3],[179,181,149]);
 assert.equal(new Set(tile).size,5);
 assert.ok(cov[1]>.25&&cov[1]<.40,'green flecks remain the primary island family');
 assert.ok(cov[2]>.065&&cov[2]<.16,'red-brown remains subordinate');
 assert.ok(boundaries(tile)>boundaries(headwearCamoIndices('norwegian-m98'))*2,
  'JGSDF remains finer than M98');
 assert.equal(FABRIC_CAMO_DENSITY[id],3.2);
});
test('8F Soldier 2000 is byte-identical to the approved 8E art and palette',()=>{
 const id='south-african-s2000';
 assert.equal(rgbaHash(id),S2000_8E_RGBA_SHA,
  '8F must not quietly repaint or rerandomize Soldier 2000');
 assert.deepEqual(HEADWEAR_CAMO_RECIPES[id].colors[3],[167,184,159]);
});
test('8F retains the 54 catalog IDs, persisted cut identities and NearestFilter',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,54);
 for(const id of ['norwegian-m98','jgsdf-type2','south-african-s2000'])
  for(const seed of [0,5,17,73,401]){
   const cut=headwearCamoPlacement('rook','trousers',id,seed);
   assert.deepEqual(cut,headwearCamoPlacement('rook','trousers',id,seed));
   const tex=wardrobeFabricCamoTexture(id,'trousers',cut);
   assert.equal(tex.image.width,64);
   assert.deepEqual(tex.image.data,headwearCamoPixels(id));
   assert.equal(tex.magFilter,THREE.NearestFilter);
   assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
   assert.equal(tex.repeat.x,32*FABRIC_CAMO_DENSITY[id]/64);
  }
 assert.deepEqual(headwearCamoIndices('pencott-metropolis'),
  headwearCamoIndices('pencott-greenzone'));
 assert.deepEqual(headwearCamoIndices('kryptek-typhon'),
  headwearCamoIndices('kryptek-highlander'));
});
