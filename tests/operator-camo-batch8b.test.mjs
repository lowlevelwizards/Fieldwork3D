import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CAMO8A_IDS,CAMO8A_RECIPES,camo8AIndices} from '../src/operator-camo-batch-8a.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoIndices,headwearCamoPixels,headwearCamoCoverage,
 headwearCamoPlacement} from '../src/operator-headwear-camo.ts';
import {wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';

const ids=[...CAMO8A_IDS];
const nDiff=(a,b)=>a.reduce((sum,value,i)=>sum+(value!==b[i]?1:0),0)/a.length;
const coverage=(id)=>headwearCamoCoverage(id);
const palette=(id)=>HEADWEAR_CAMO_RECIPES[id].colors;

test('8B retains all 54 print IDs, legacy 7C Leto art, and saved looks',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(46),ids);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,54);
 for(const id of ids){
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  assert.equal(readWardrobe({...initialWardrobe(),fabricCamo:{trousers:id}}).fabricCamo.trousers,id);
 }
 assert.ok(HEADWEAR_CAMO_IDS.includes('ss-leto'));
});

test('8B reference families achieve distinct palette roles and structural silhouettes',()=>{
 const izlom=coverage('russian-izlom'),jgsdf=coverage('jgsdf-type2'),s2k=coverage('south-african-s2000');
 console.log('8B motif coverage',JSON.stringify({
  izlom:izlom.map(n=>+n.toFixed(3)),jgsdf:jgsdf.map(n=>+n.toFixed(3)),
  soldier2000:s2k.map(n=>+n.toFixed(3))
 }));
 assert.ok(izlom[2]<.23,'Izlom cannot be dominated by pale Leto-like tan');
 assert.ok(izlom[2]>.01,'Izlom still has warm tan fracture glints');
 assert.ok(s2k[0]>.38,'Soldier 2000 must visibly retain a broad brown Kalahari ground, not Jieitai-green ground');
 assert.ok(jgsdf[0]>.15,'Jieitai Dot retains recognizable leafy green ground');
 assert.ok(palette('south-african-s2000')[0][0]>palette('south-african-s2000')[0][1],
  'Soldier 2000 base is warmer earth brown, not moss green');
 assert.ok(palette('jgsdf-type2')[0][1]>palette('jgsdf-type2')[0][0],
  'Jieitai ground is greener than earth-brown Soldier 2000');
 assert.ok(nDiff(headwearCamoIndices('jgsdf-type2'),
  headwearCamoIndices('south-african-s2000'))>.35,'JGSDF and S2000 must have independent masks');
 assert.ok(nDiff(headwearCamoIndices('russian-izlom'),
  headwearCamoIndices('ss-leto'))>.35,'Izlom must not borrow Leto oakleaf mask');
});

test('8B broken Greek paint and broad blue Kamysh retain independent stripe prints',()=>{
 const greek=headwearCamoIndices('greek-lizard'),
 kam=headwearCamoIndices('urban-kamysh');
 assert.ok(nDiff(greek,kam)>.28);
 assert.notDeepEqual(greek,headwearCamoIndices('tiger-stripe'));
 assert.notDeepEqual(kam,headwearCamoIndices('tiger-stripe'));
 assert.ok(palette('greek-lizard')[0][0]>palette('greek-lizard')[0][2],
  'Greek canvas stays warmer khaki');
 assert.ok(palette('urban-kamysh')[0][2]>=palette('urban-kamysh')[0][0],
  'Kamysh canvas stays cold blue-gray');
});

test('8B preserves exact PenCott and Kryptek family index maps, with distinct graded colors',()=>{
 assert.deepEqual(headwearCamoIndices('pencott-metropolis'),
  headwearCamoIndices('pencott-greenzone'));
 assert.deepEqual(headwearCamoIndices('kryptek-typhon'),
  headwearCamoIndices('kryptek-highlander'));
 assert.notDeepEqual(headwearCamoPixels('pencott-metropolis'),
  headwearCamoPixels('pencott-greenzone'));
 assert.notDeepEqual(headwearCamoPixels('kryptek-typhon'),
  headwearCamoPixels('kryptek-highlander'));
 for(const [r,g,b] of palette('kryptek-typhon'))
  assert.ok(Math.abs(r-b)<11&&Math.abs(g-b)<11,
   'Typhon neutral charcoal rather than purple or blue-shifted gray');
 assert.equal(palette('norwegian-m98').length,3);
 assert.equal(new Set(headwearCamoIndices('norwegian-m98')).size,3);
 assert.ok(palette('norwegian-m98')[0][1]>palette('norwegian-m98')[0][0],
  'M98 midgreen should have yellow-olive character');
});

test('8B all eight use cached, opaque, nearest-filtered 64px indexed cloth',()=>{
 for(const id of ids){
  const tile=headwearCamoIndices(id),bytes=headwearCamoPixels(id);
  assert.equal(tile.length,4096);
  assert.equal(bytes.length,16384);
  assert.deepEqual(tile,headwearCamoIndices(id),'stable master '+id);
  const colors=palette(id);
  const occupied=new Set(tile);
  assert.equal(occupied.size,colors.length,'all inks used '+id);
  for(let i=0;i<4096;i++){
   const j=i*4,c=colors[tile[i]];
   assert.ok(c,'palette-safe pixel '+id+' @ '+i);
   assert.deepEqual([...bytes.slice(j,j+3)],c,id);
   assert.equal(bytes[j+3],255,'opaque print '+id);
  }
  const tex=wardrobeFabricCamoTexture(id,'trousers',
   headwearCamoPlacement('rook','trousers',id,3));
  assert.equal(tex.image.width,64);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
  assert.deepEqual(tex.image.data,bytes);
 }
});
