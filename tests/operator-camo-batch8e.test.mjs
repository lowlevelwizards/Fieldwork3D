import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoIndices,headwearCamoCoverage,headwearCamoPixels,
 headwearCamoPlacement,headwearCamoSize} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod,
 wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';
const targets=['norwegian-m98','jgsdf-type2','south-african-s2000'];
const frozen=['russian-izlom','greek-lizard','urban-kamysh',
 'pencott-metropolis','kryptek-typhon','ss-leto'];
function edges(tile){
 let count=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const v=tile[y*64+x];
  if(v!==tile[y*64+((x+1)&63)])count++;
  if(v!==tile[((y+1)&63)*64+x])count++;
 }
 return count;
}
function coarseBlockCoverage(tile,blockSize=16){
 let max=0,min=Infinity;
 for(let sy=0;sy<64;sy+=blockSize)for(let sx=0;sx<64;sx+=blockSize){
  const n=new Array(5).fill(0);
  for(let y=sy;y<sy+blockSize;y++)
   for(let x=sx;x<sx+blockSize;x++)n[tile[y*64+x]]++;
  max=Math.max(max,...n.map(v=>v/(blockSize*blockSize)));
  min=Math.min(min,n.filter(v=>v>0).length);
 }
 return {max,min};
}
test('8E retains every one of the 62 IDs, deterministic masters, original saves and frozen relatives',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,62);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,62);
 for(const id of [...targets,...frozen]){
  const a=headwearCamoIndices(id),b=headwearCamoIndices(id);
  assert.equal(headwearCamoSize(id),64);
  assert.equal(a.length,4096);
  assert.deepEqual(a,b,'unchanging master '+id);
  assert.equal(headwearCamoPixels(id).length,16384);
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  assert.equal(readWardrobe({...initialWardrobe(),fabricCamo:{trousers:id}}).fabricCamo.trousers,id);
 }
 assert.deepEqual(headwearCamoIndices('pencott-metropolis'),
  headwearCamoIndices('pencott-greenzone'));
 assert.deepEqual(headwearCamoIndices('kryptek-typhon'),
  headwearCamoIndices('kryptek-highlander'));
 assert.ok(new Set(headwearCamoIndices('ss-leto')).size>=3);
});
test('8E rebuilt M98 has balanced large three-ink organic shapes across garment crops',()=>{
 const id='norwegian-m98',tile=headwearCamoIndices(id);
 const coverage=headwearCamoCoverage(id);
 console.log('8E M98 coverage',coverage.map(v=>+v.toFixed(3)));
 assert.deepEqual([...new Set(tile)].sort(),[0,1,2]);
 assert.equal(HEADWEAR_CAMO_RECIPES[id].colors.length,3);
 for(const part of coverage)
  assert.ok(part>.28&&part<.41,'M98 must not repeat giant monochrome panels');
 const c=coarseBlockCoverage(tile,32);
 assert.ok(c.max<.70,'no single ink exceeds 70% of a 32px crop');
 assert.ok(c.min>=3,'all three inks present in 32px crops');
 assert.equal(FABRIC_CAMO_DENSITY[id],3.0,'world scale was revised after 8F crop audits');
 assert.ok(fabricCamoWorldPeriod(id)>21&&fabricCamoWorldPeriod(id)<22);
});
test('8E JGSDF is dense five-tone flecking, not oversized woodland regions',()=>{
 const id='jgsdf-type2',tile=headwearCamoIndices(id);
 const coverage=headwearCamoCoverage(id);
 const m98=headwearCamoIndices('norwegian-m98');
 console.log('8E JGSDF coverage',coverage.map(v=>+v.toFixed(3)));
 console.log('8E print complexity',JSON.stringify({jgsdf:edges(tile),m98:edges(m98),
  jgsdf16:coarseBlockCoverage(tile,16)}));
 assert.equal(new Set(tile).size,5);
 assert.ok(coverage[0]>.28&&coverage[0]<.42,'leafy base must stay exposed');
 assert.ok(coverage[1]>.23&&coverage[1]<.39,'green flecks stay dominant');
 assert.ok(coverage[2]>.07&&coverage[2]<.20,'rust marks must remain accents');
 assert.ok(coverage[3]>.08&&coverage[3]<.21,'khaki flecks appear in clusters');
 assert.ok(coverage[4]>.04&&coverage[4]<.16,'charcoal stays punctuated');
 assert.ok(edges(tile)>edges(m98)*1.55,'substantially finer print than M98');
 assert.ok(coarseBlockCoverage(tile,16).max<.82,'no giant uniform 16px patch');
 assert.equal(FABRIC_CAMO_DENSITY[id],3.2);
});
test('8E Soldier 2000 is a minor sage/spot edit on the 8D earth-ground structure',()=>{
 const id='south-african-s2000',tile=headwearCamoIndices(id);
 const coverage=headwearCamoCoverage(id),palette=HEADWEAR_CAMO_RECIPES[id].colors;
 console.log('8E Soldier 2000 coverage',coverage.map(v=>+v.toFixed(3)));
 assert.deepEqual(palette[3],[167,184,159],
  'quieter sage, not the near-white older highlight');
 assert.ok(coverage[0]>.38&&coverage[0]<.56,'exposed brown remains the major ground');
 assert.ok(coverage[3]>.035&&coverage[4]>.025,'both light and dark interior spots remain');
 assert.ok(edges(tile)>edges(headwearCamoIndices('norwegian-m98')));
 assert.equal(new Set(tile).size,5);
});
test('8E five fixed cuts match shared material pixels and nearest-neighbor metric repeats',()=>{
 for(const id of targets)for(const seed of [0,5,17,73,401]){
  const cut=headwearCamoPlacement('rook','trousers',id,seed);
  assert.deepEqual(cut,headwearCamoPlacement('rook','trousers',id,seed));
  const tex=wardrobeFabricCamoTexture(id,'trousers',cut);
  assert.equal(tex.image.width,64);
  assert.deepEqual(tex.image.data,headwearCamoPixels(id));
  assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex.repeat.x,32*FABRIC_CAMO_DENSITY[id]/64);
  assert.equal(tex.repeat.y,tex.repeat.x);
 }
});
