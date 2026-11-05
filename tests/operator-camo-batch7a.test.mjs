import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CAMO7A_IDS,camo7AIndices,CAMO7A_RECIPES} from '../src/operator-camo-batch-7a.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,HEADWEAR_CAMO_DENSITY,
 headwearCamoPixels,headwearCamoIndices,headwearCamoSize,headwearCamoCoverage,
 headwearCamoPlacement,headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod,wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {CAMO_CATALOG,filterCamoCatalog} from '../src/operator-headwear-camo-catalog.ts';
import {fabricCamoCompatible,FABRIC_CAMO_POLICY} from '../src/operator-fabric-camo-policy.ts';
import {validArmorPrint,validRigPrint} from '../src/operator-rig-authenticity-policy.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';

const eight=['multicam-black','multicam-alpine','pencott-greenzone','pencott-badlands',
 'desert-night','kryptek-highlander','berezka','spectre-skwo'];
const kit={top:'acu-shirt',trousers:'acu-trousers',armorStyle:'plate-standard',
 rigStyle:'micro-rig',packStyle:'rucksack'};

test('7A is precisely eight appended identifiers, frozen old 38 and stable saves',()=>{
 assert.deepEqual(CAMO7A_IDS,eight);
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(38,46),eight);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,54);
 assert.deepEqual(Object.keys(FABRIC_CAMO_POLICY).sort(),[...HEADWEAR_CAMO_IDS].sort());
 for(const id of eight){
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id,headwearCamoRoll:11}).headwearCamo,id);
  assert.equal(readWardrobe({...initialWardrobe(),fabricCamo:{trousers:id}}).fabricCamo?.trousers,id);
  assert.ok(headwearCamoChoices('boonie').includes(id),id);
  assert.ok(CAMO_CATALOG[id]?.origin,id);
 }
 assert.ok(!headwearCamoChoices('high-cut').includes('desert-night'));
 assert.ok(!headwearCamoChoices('high-cut').includes('berezka'));
 assert.ok(!headwearCamoChoices('ach').includes('desert-night'));
});

test('7A all eight 64px source tiles preserve palette ink ratios, 3D texture identity and independent art',()=>{
 const signatures=new Set();
 for(const id of eight){
  const recipe=HEADWEAR_CAMO_RECIPES[id],tile=headwearCamoIndices(id),bytes=headwearCamoPixels(id);
  const ratios=headwearCamoCoverage(id);
  assert.equal(headwearCamoSize(id),64,id);
  assert.equal(tile.length,4096,id);
  assert.equal(bytes.length,16384,id);
  assert.equal(recipe.colors.length,ratios.length,id);
  assert.ok(ratios.every(n=>n>.01&&n<.8),id+' each ink must matter');
  assert.ok(ratios.every((n,i)=>Math.abs(n-recipe.targetCoverage[i])<.035),id);
  assert.ok(Number.isFinite(FABRIC_CAMO_DENSITY[id]));
  assert.ok(fabricCamoWorldPeriod(id)>=10&&fabricCamoWorldPeriod(id)<=34);
  for(let i=0;i<tile.length;i++){
   const o=i*4;
   assert.deepEqual(Array.from(bytes.slice(o,o+3)),recipe.colors[tile[i]],id);
   assert.equal(bytes[o+3],255,id);
  }
  signatures.add(Buffer.from(bytes).toString('base64'));
  assert.deepEqual(tile,headwearCamoIndices(id),'same seeded source '+id);
  const cut=headwearCamoPlacement('rook','trousers',id,7);
  const cloth=wardrobeFabricCamoTexture(id,'trousers',cut);
  assert.equal(cloth.image.width,64,id);
  assert.equal(cloth.magFilter,THREE.NearestFilter,id);
  assert.equal(cloth.colorSpace,THREE.SRGBColorSpace,id);
  assert.equal(cloth.image.data,headwearCamoPixels(id),id+' same cloth master bytes');
 }
 assert.equal(signatures.size,8,'eight visually unique colored masters');
});

test('7A MultiCam Black and Alpine preserve EXACT 2x original MultiCam indices and 16-unit period',()=>{
 const source=headwearCamoIndices('multicam');
 for(const id of ['multicam-black','multicam-alpine']){
  const t=headwearCamoIndices(id);
  assert.deepEqual(t,camo7AIndices(id,source));
  for(let y=0;y<64;y++)for(let x=0;x<64;x++)
   assert.equal(t[y*64+x],source[(y>>1)*32+(x>>1)],id+' original color-role topology');
  assert.equal(HEADWEAR_CAMO_DENSITY[id],4);
  assert.equal(FABRIC_CAMO_DENSITY[id],4);
  assert.equal(64/FABRIC_CAMO_DENSITY[id],32/FABRIC_CAMO_DENSITY.multicam);
 }
 assert.notDeepEqual(CAMO7A_RECIPES['multicam-black'].colors,CAMO7A_RECIPES['multicam-alpine'].colors);
});

test('7A PenCott partners share indexed fractal geometry, but neither is a MultiCam recolor',()=>{
 const a=headwearCamoIndices('pencott-greenzone');
 const b=headwearCamoIndices('pencott-badlands');
 assert.deepEqual(a,b,'family geometry shared');
 assert.notDeepEqual(headwearCamoPixels('pencott-greenzone'),headwearCamoPixels('pencott-badlands'));
 assert.notDeepEqual(a,headwearCamoIndices('multicam-tropic'));
 assert.notDeepEqual(a,headwearCamoIndices('aor2'));
});

test('7A Desert Night exposes actual periodic lattice and Berezka repeated sunray flashes',()=>{
 const night=headwearCamoIndices('desert-night'),birch=headwearCamoIndices('berezka');
 let grid=0,gridCorrect=0,dark=0,bright=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const index=y*64+x,ink=night[index];
  if(x%8===0||y%8===0){grid++;if(ink===1||ink===2)gridCorrect++;}
  if(ink===2)dark++;
  if(birch[index]===1||birch[index]===2)bright++;
 }
 assert.equal(gridCorrect,grid,'DNC dark overprint may cover but not erase the grid');
 assert.ok(dark>40,'DNC dark shapes survive at screen scale');
 assert.ok(bright>350&&bright<1900,'Berezka has repeating bright sunray chips');
 assert.ok(headwearCamoCoverage('berezka')[3]>.01,'Berezka dark flecks survive on cloth');
 assert.notDeepEqual(headwearCamoIndices('spectre-skwo'),headwearCamoIndices('russian-emr'));
 assert.notDeepEqual(headwearCamoIndices('kryptek-highlander'),headwearCamoIndices('pencott-greenzone'));
});

test('MM-14 revised palette is warmer/greener and stays distinct from UCP and AOR',()=>{
 const c=HEADWEAR_CAMO_RECIPES['ukrainian-mm14'].colors;
 assert.equal(c.length,5);
 assert.ok(c[0][0]<208&&c[0][2]<180,'not nearly white');
 assert.ok(c[2][1]>c[2][0],'sage green not neutral gray');
 assert.ok(c[3][1]>c[3][0],'olive midtone');
 assert.ok(c[4][1]>c[4][0],'charcoal-green instead of black-gray');
 const cov=headwearCamoCoverage('ukrainian-mm14');
 assert.ok(cov[0]<.55,'avoid giant blank pale field');
 assert.ok(cov[2]+cov[3]>.20,'substantial connected olive midtones');
 assert.notDeepEqual(headwearCamoIndices('ukrainian-mm14'),headwearCamoIndices('aor2'));
});

test('7A garment and equipment compatibility is conservative and cut-specific',()=>{
 assert.equal(fabricCamoCompatible('multicam-black','top',kit),true);
 assert.equal(fabricCamoCompatible('pencott-greenzone','trousers',kit),true);
 assert.equal(fabricCamoCompatible('kryptek-highlander','top',kit),true);
 assert.equal(validRigPrint('micro-rig','multicam-black'),true);
 assert.equal(validArmorPrint('plate-standard','pencott-greenzone'),true);
 assert.equal(fabricCamoCompatible('multicam-alpine','armor',kit),false);
 assert.equal(fabricCamoCompatible('desert-night','armor',kit),false);
 assert.equal(fabricCamoCompatible('desert-night','top',{...kit,top:'smock-jacket'}),true);
 assert.equal(fabricCamoCompatible('desert-night','top',kit),false);
 assert.equal(fabricCamoCompatible('berezka','top',{...kit,top:'gorka-jacket'}),true);
 assert.equal(fabricCamoCompatible('berezka','trousers',{...kit,trousers:'gorka-trousers'}),true);
 assert.equal(fabricCamoCompatible('spectre-skwo','trousers',{...kit,trousers:'gorka-trousers'}),true);
 assert.equal(validRigPrint('chicom-rig','kryptek-highlander'),false);
 assert.equal(validArmorPrint('plate-heavy','berezka'),false);
 const uk=filterCamoCatalog({terrain:'all',style:'all',origin:'Britain',
  text:'pencott',onlyCompatible:false,onlyFavorites:false},[],new Set());
 assert.ok(uk.includes('pencott-greenzone')||uk.includes('pencott-badlands'),
  'lookup by label/ID remains accessible');
});
