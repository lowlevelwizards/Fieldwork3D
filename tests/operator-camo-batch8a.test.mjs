import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {CAMO8A_IDS,CAMO8A_RECIPES,camo8AIndices} from '../src/operator-camo-batch-8a.ts';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,HEADWEAR_CAMO_DENSITY,
 headwearCamoPixels,headwearCamoIndices,headwearCamoSize,headwearCamoCoverage,
 headwearCamoPlacement,headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod,wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {CAMO_CATALOG,CAMO_ORIGINS,filterCamoCatalog} from '../src/operator-headwear-camo-catalog.ts';
import {FABRIC_CAMO_POLICY,fabricCamoCompatible} from '../src/operator-fabric-camo-policy.ts';
import {uniformCutCamoCompatible} from '../src/operator-uniform-cut-eligibility.ts';
import {validArmorPrint,validRigPrint} from '../src/operator-rig-authenticity-policy.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';

const eight=[
 'russian-izlom','greek-lizard','urban-kamysh','jgsdf-type2',
 'pencott-metropolis','south-african-s2000','kryptek-typhon','norwegian-m98'
];
const kit={top:'bdu-shirt',trousers:'bdu-trousers',armorStyle:'plate-standard',
 rigStyle:'micro-rig',packStyle:'rucksack'};
const mismatch=(a,b)=>a.reduce((n,c,i)=>n+(c!==b[i]?1:0),0)/a.length;

test('8A appends exactly eight IDs to the frozen old 46, with no migrations',()=>{
 assert.deepEqual(CAMO8A_IDS,eight);
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(46),eight);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,54);
 assert.deepEqual(Object.keys(FABRIC_CAMO_POLICY).sort(),[...HEADWEAR_CAMO_IDS].sort());
 for(const id of eight){
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id,headwearCamoRoll:12}).headwearCamo,id);
  assert.equal(readWardrobe({...initialWardrobe(),fabricCamo:{trousers:id}}).fabricCamo.trousers,id);
  assert.ok(headwearCamoChoices('boonie').includes(id),id);
  assert.ok(CAMO_CATALOG[id],id);
 }
 for(const origin of ['Greece','Japan','South Africa','Norway'])
  assert.ok(CAMO_ORIGINS.includes(origin),origin);
});

test('8A all eight have deterministic 64px masters, valid pigments and shared texture pixels',()=>{
 const signatures=new Set();
 for(const id of eight){
  const recipe=HEADWEAR_CAMO_RECIPES[id],tile=headwearCamoIndices(id),pixels=headwearCamoPixels(id);
  const coverage=headwearCamoCoverage(id);
  assert.equal(headwearCamoSize(id),64,id);
  assert.equal(tile.length,4096,id);
  assert.equal(pixels.length,16384,id);
  assert.equal(recipe.colors.length,coverage.length,id);
  assert.ok(coverage.every(v=>v>.005&&v<.87),id+' each color has meaning');
  assert.ok(Number.isFinite(HEADWEAR_CAMO_DENSITY[id]));
  assert.ok(Number.isFinite(FABRIC_CAMO_DENSITY[id]));
  assert.ok(fabricCamoWorldPeriod(id)>=12&&fabricCamoWorldPeriod(id)<=30,id);
  assert.deepEqual(tile,headwearCamoIndices(id),'deterministic seed-independent print '+id);
  for(let i=0;i<4096;i++){
   const n=tile[i],a=recipe.colors[n],o=i*4;
   assert.ok(a, id+' missing palette ink '+n);
   assert.deepEqual([...pixels.slice(o,o+3)],a,id);
   assert.equal(pixels[o+3],255,id);
  }
  const cut=headwearCamoPlacement('rook','trousers',id,3);
  const tex=wardrobeFabricCamoTexture(id,'trousers',cut);
  assert.equal(tex.image.width,64,id);
  assert.equal(tex.magFilter,THREE.NearestFilter,id);
  assert.equal(tex.colorSpace,THREE.SRGBColorSpace,id);
  assert.equal(tex.image.data,pixels,id);
  signatures.add(Buffer.from(pixels).toString('base64'));
 }
 assert.equal(signatures.size,8,'eight distinct palettes and mastered prints');
});

test('8A two commercial colorways preserve exact 7A family ink indices',()=>{
 const pen=headwearCamoIndices('pencott-greenzone');
 const met=headwearCamoIndices('pencott-metropolis');
 assert.deepEqual(met,pen,'MetroPolis is a true PenCott relative');
 assert.deepEqual(met,camo8AIndices('pencott-metropolis',{pencott:pen}));
 assert.notDeepEqual(headwearCamoPixels('pencott-metropolis'),headwearCamoPixels('pencott-greenzone'));
 const high=headwearCamoIndices('kryptek-highlander');
 const typ=headwearCamoIndices('kryptek-typhon');
 assert.deepEqual(typ,high,'Typhon preserves fractal Highlander fracture/net layout');
 assert.deepEqual(typ,camo8AIndices('kryptek-typhon',{highlander:high}));
 assert.notDeepEqual(headwearCamoPixels('kryptek-typhon'),headwearCamoPixels('kryptek-highlander'));
 assert.throws(()=>camo8AIndices('kryptek-typhon'),/needs original Highlander/);
 assert.throws(()=>camo8AIndices('pencott-metropolis'),/needs original PenCott/);
});

test('8A nearest neighbor prints are structurally distinct where they should be',()=>{
 const iza=headwearCamoIndices('russian-izlom');
 const fleck=headwearCamoIndices('flecktarn');
 const greek=headwearCamoIndices('greek-lizard');
 const kam=headwearCamoIndices('urban-kamysh');
 const tiger=headwearCamoIndices('tiger-stripe');
 const jgsdf=headwearCamoIndices('jgsdf-type2');
 const s2k=headwearCamoIndices('south-african-s2000');
 const m98=headwearCamoIndices('norwegian-m98');
 assert.ok(mismatch(iza,jgsdf)>.20,'angular Izlom not circular JSDF flecks');
 assert.ok(mismatch(greek,kam)>.25,'Greek and Kamysh need independent stripe structures');
 assert.ok(mismatch(jgsdf,iza)>.20);
 assert.ok(mismatch(s2k,headwearCamoIndices('ss-leto'))>.20);
 assert.ok(mismatch(m98,headwearCamoIndices('swedish-m90'))>.25);
 assert.notDeepEqual(iza,fleck);
 assert.notDeepEqual(kam,tiger);
 assert.equal(new Set(m98).size,3,'Norwegian M98 intentionally has only three colors');
 assert.equal(CAMO8A_RECIPES['jgsdf-type2'].colors.length,5);
 assert.equal(CAMO8A_RECIPES['south-african-s2000'].colors.length,5);
});

test('8A authentic garment restrictions preserve realism rather than unlimited prints',()=>{
 assert.equal(uniformCutCamoCompatible('bdu-shirt','greek-lizard'),true);
 assert.equal(uniformCutCamoCompatible('bdu-trousers','south-african-s2000'),true);
 assert.equal(uniformCutCamoCompatible('acu-shirt','jgsdf-type2'),true);
 assert.equal(uniformCutCamoCompatible('bdu-shirt','norwegian-m98'),true);
 assert.equal(fabricCamoCompatible('russian-izlom','top',{...kit,top:'gorka-jacket'}),true);
 assert.equal(fabricCamoCompatible('urban-kamysh','trousers',{...kit,trousers:'gorka-trousers'}),true);
 assert.equal(fabricCamoCompatible('greek-lizard','top',{...kit,top:'combat-shirt'}),false);
 assert.equal(fabricCamoCompatible('urban-kamysh','armor',kit),false);
 assert.equal(fabricCamoCompatible('south-african-s2000','armor',kit),false);
 assert.equal(fabricCamoCompatible('jgsdf-type2','gear',kit),false);
 assert.equal(fabricCamoCompatible('norwegian-m98','pack',kit),true);
 assert.equal(fabricCamoCompatible('greek-lizard','pack',kit),false);
 assert.equal(validRigPrint('micro-rig','pencott-metropolis'),true);
 assert.equal(validArmorPrint('plate-standard','kryptek-typhon'),true);
 assert.equal(validArmorPrint('plate-standard','greek-lizard'),false);
 assert.equal(validRigPrint('chicom-rig','kryptek-typhon'),false);
 assert.equal(headwearCamoChoices('high-cut').includes('greek-lizard'),false);
 assert.equal(headwearCamoChoices('pasgt').includes('greek-lizard'),true);
 assert.equal(headwearCamoChoices('high-cut').includes('pencott-metropolis'),true);
});

test('8A country and pattern-family catalog filtering is discoverable',()=>{
 const all=HEADWEAR_CAMO_IDS;
 const f=(origin,text='')=>filterCamoCatalog(
  {origin,style:'all',terrain:'all',text,onlyCompatible:false,onlyFavorites:false},
  all,new Set());
 assert.ok(f('Greece').includes('greek-lizard'));
 assert.ok(f('Japan').includes('jgsdf-type2'));
 assert.ok(f('South Africa').includes('south-african-s2000'));
 assert.ok(f('Norway').includes('norwegian-m98'));
 assert.ok(f('Britain','metropolis').includes('pencott-metropolis'));
});
