import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {CAMO9A_IDS,CAMO9A_RECIPES,camo9AIndices} from '../src/operator-camo-batch-9a.ts';
import {CAMO9B_IDS,CAMO9B_RECIPES,camo9BIndices} from '../src/operator-camo-batch-9b.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoIndices,headwearCamoCoverage,headwearCamoPixels,
 headwearCamoPlacement,headwearCamoSize,headwearCamoChoices}
 from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,wardrobeFabricCamoTexture,
 fabricCamoWorldPeriod} from '../src/operator-fabric-camo-materials.ts';
import {FABRIC_CAMO_POLICY,fabricCamoCompatible} from '../src/operator-fabric-camo-policy.ts';
import {CAMO_CATALOG,filterCamoCatalog} from '../src/operator-headwear-camo-catalog.ts';
import {uniformCutCamoCompatible} from '../src/operator-uniform-cut-eligibility.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {resolveAutomaticGearColors} from '../src/operator-gear-color-policy.ts';
import {isGarmentSolidId,CAMO_CUFF_DEFAULTS} from '../src/operator-garment-color-policy.ts';

const newIds=[...CAMO9A_IDS,...CAMO9B_IDS];
const digest=id=>createHash('sha256').update(headwearCamoPixels(id)).digest('hex');
const outfit={top:'bdu-shirt',trousers:'bdu-trousers',
 armorStyle:'plate-standard',rigStyle:'micro-rig',packStyle:'field-pack'};
function mismatches(a,b){
 let different=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])different++;
 return different/a.length;
}
function transitions(tile){
 let horizontal=0,vertical=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const v=tile[y*64+x];
  if(v!==tile[y*64+((x+1)&63)])horizontal++;
  if(v!==tile[((y+1)&63)*64+x])vertical++;
 }
 return {horizontal,vertical};
}
test('9A and 9B introduce eight stable new IDs in correct ordered release batches',()=>{
 assert.equal(CAMO9A_IDS.length,6);
 assert.equal(CAMO9B_IDS.length,2);
 assert.equal(HEADWEAR_CAMO_IDS.length,62);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,62);
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(54),newIds);
 for(const id of newIds){
  assert.ok(CAMO_CATALOG[id],id+' catalog metadata');
  assert.ok(FABRIC_CAMO_POLICY[id],id+' realistic channel policy');
  assert.ok(headwearCamoChoices('boonie').includes(id),id+' in boonies');
  assert.ok(HEADWEAR_CAMO_RECIPES[id],id+' palette/shape');
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  assert.equal(readWardrobe({...initialWardrobe(),fabricCamo:{trousers:id}}).fabricCamo.trousers,id);
 }
 for(const country of ['France','South Korea','Indonesia'])
  assert.ok(filterCamoCatalog({origin:country,style:'all',terrain:'all',
   text:'',onlyCompatible:false,onlyFavorites:false},HEADWEAR_CAMO_IDS,new Set()).length>0,country);
});
test('9A 9B indexed tiles, opacity, palettes, clipping, and metric fabric contract',()=>{
 const sha=new Set();
 for(const id of newIds){
  const recipe=HEADWEAR_CAMO_RECIPES[id];
  const tile=headwearCamoIndices(id),pixels=headwearCamoPixels(id);
  const coverage=headwearCamoCoverage(id);
  assert.equal(headwearCamoSize(id),64,id);
  assert.equal(tile.length,4096,id);
  assert.equal(pixels.length,16384,id);
  assert.deepEqual(tile,headwearCamoIndices(id),id+' deterministic master');
  assert.equal(coverage.length,recipe.colors.length,id);
  assert.ok(recipe.colors.length>=2&&recipe.colors.length<=5,id);
  for(let n=0;n<coverage.length;n++)
   assert.ok(coverage[n]>.008&&coverage[n]<.85,
    id+' ink '+n+' exists meaningfully, coverage='+coverage[n]);
  for(let n=0;n<tile.length;n++){
   const c=recipe.colors[tile[n]],i=n*4;
   assert.ok(c,id+' palette lookup for index '+tile[n]);
   assert.equal(pixels[i],c[0]);assert.equal(pixels[i+1],c[1]);
   assert.equal(pixels[i+2],c[2]);assert.equal(pixels[i+3],255);
  }
  const cut=headwearCamoPlacement('rook','trousers',id,37);
  assert.deepEqual(cut,headwearCamoPlacement('rook','trousers',id,37));
  const texture=wardrobeFabricCamoTexture(id,'trousers',cut);
  assert.equal(texture.image.data,pixels,id);
  assert.equal(texture.image.width,64,id);
  assert.equal(texture.magFilter,THREE.NearestFilter,id);
  assert.equal(texture.colorSpace,THREE.SRGBColorSpace,id);
  assert.ok(fabricCamoWorldPeriod(id)>14&&fabricCamoWorldPeriod(id)<30,id);
  assert.equal(texture.repeat.x,32*FABRIC_CAMO_DENSITY[id]/64,id);
  sha.add(digest(id));
  console.log('9A9B art metric',id,JSON.stringify({
   coverage:coverage.map(v=>+v.toFixed(3)),
   transitions:transitions(tile),scale:FABRIC_CAMO_DENSITY[id]}));
 }
 assert.equal(sha.size,8,'eight genuinely separate printed textures');
 assert.deepEqual(camo9AIndices('french-cce'),headwearCamoIndices('french-cce'));
 assert.deepEqual(camo9BIndices('cadpat-ar'),headwearCamoIndices('cadpat-ar'));
 assert.ok(mismatches(headwearCamoIndices('french-cce'),headwearCamoIndices('russian-vsr93'))>.3);
 assert.ok(mismatches(headwearCamoIndices('british-desert-dpm'),headwearCamoIndices('french-cce'))>.3);
});
test('9A9B recognizable directional silhouettes and protected two/three ink families',()=>{
 const vsr=transitions(headwearCamoIndices('russian-vsr93'));
 const kop=transitions(headwearCamoIndices('indonesian-kopassus-flowing-blood'));
 const abu=transitions(headwearCamoIndices('usaf-abu'));
 console.log('9A9B directional signatures',JSON.stringify({vsr,kop,abu}));
 assert.ok(vsr.horizontal>vsr.vertical*.9,'VSR is not just Flora horizontal bars');
 assert.ok(kop.horizontal>kop.vertical*.9,'Kopassus ribbons must break vertically');
 assert.ok(abu.vertical>abu.horizontal*.85,'ABU is directional horizontal digital tiger');
 assert.equal(new Set(headwearCamoIndices('british-desert-dpm')).size,2);
 assert.equal(new Set(headwearCamoIndices('cadpat-ar')).size,3);
 assert.equal(new Set(headwearCamoIndices('russian-vsr93')).size,3);
 assert.equal(new Set(headwearCamoIndices('swiss-taz90')).size,4);
});
test('9A9B conservative garment cuts, headwear and print ownership',()=>{
 for(const id of ['french-cce','russian-vsr93','swiss-taz90',
  'british-desert-dpm','indonesian-kopassus-flowing-blood']){
  assert.equal(uniformCutCamoCompatible('bdu-shirt',id),true,id);
  assert.equal(fabricCamoCompatible(id,'top',outfit),true,id);
  assert.equal(fabricCamoCompatible(id,'armor',outfit),false,id);
  assert.equal(fabricCamoCompatible(id,'gear',outfit),false,id);
 }
 for(const id of ['south-korean-granite-b','cadpat-ar','usaf-abu']){
  assert.equal(uniformCutCamoCompatible('acu-shirt',id),true,id);
  assert.equal(uniformCutCamoCompatible('acu-trousers',id),true,id);
  assert.equal(fabricCamoCompatible(id,'top',{...outfit,top:'acu-shirt'}),true,id);
  assert.equal(fabricCamoCompatible(id,'armor',outfit),false,id);
 }
 assert.equal(headwearCamoChoices('high-cut').includes('indonesian-kopassus-flowing-blood'),false);
 assert.equal(headwearCamoChoices('high-cut').includes('cadpat-ar'),true);
 assert.equal(headwearCamoChoices('pasgt').includes('british-desert-dpm'),true);
 assert.equal(fabricCamoCompatible('french-cce','pack',outfit),true);
 assert.equal(fabricCamoCompatible('russian-vsr93','pack',outfit),false);
});
test('9A9B every new top print maps to valid default armor/gear/pack solids',()=>{
 for(const id of newIds){
  assert.ok(isGarmentSolidId(CAMO_CUFF_DEFAULTS[id]),id+' trim color');
  const resolved=resolveAutomaticGearColors({print:id});
  for(const slot of ['armor','gear','pack'])
   assert.ok(isGarmentSolidId(resolved?.[slot]),id+' '+slot+' is a real swatch');
 }
});
test('9A9B freeze approved 8F JGSDF and 8E Soldier 2000 bytes',()=>{
 assert.equal(digest('jgsdf-type2'),
  '05c026d4979bd4941a94e9f3415d16ca59e9fd706c42dbdb828ac0071d8871e7');
 assert.equal(digest('south-african-s2000'),
  '4cd092f87a82a262c5ed78d5436f5e5725ab0a0cac8dc832adebd1f991505bb9');
});
