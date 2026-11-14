import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,HEADWEAR_CAMO_SIZE,HEADWEAR_CAMO_DENSITY,headwearCamoSize,
 headwearCamoChoices,headwearCamoIndices,headwearCamoCoverage,
 headwearCamoPixels,resolvedHeadwearCamo,headwearCamoPlacement,
 headwearCamoFrontBrownFraction,headwearCamoM81CrownCoverage,headwearCamoAppliedCoverage,nextHeadwearCamoRoll} from '../src/operator-headwear-camo.ts';
import {headwearCamoTexture,headwearDetailTexture,headwearFinishTexture}
 from '../src/operator-headwear-materials.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {CAMO_CATALOG,CAMO_ORIGINS,filterCamoCatalog}
 from '../src/operator-headwear-camo-catalog.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {HEADWEAR_SOLID_COLORS,headwearColorChoices} from '../src/operator-headwear-colors.ts';

const pose=(kit,wardrobe)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 unarmedPreview:true,equipment:kit,wardrobe
});
// Independent test shard; original coverage and assertions preserved.
test('5A mobile browser provides grouped searchable filtering, favorites and recent choices',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const id of ['camoTerrainFilter','camoStyleFilter','camoOriginFilter',
  'camoSearchFilter','camoCompatibleFilter','camoFavoriteFilter',
  'camoBrowseSummary','camoRecentRow','camoBrowseEmpty'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(lab,/filterCamoCatalog/);
 assert.match(lab,/camoFavorites/);
 assert.match(lab,/camoRecents/);
 assert.match(lab,/camoCompareDetails\.open/);
 const initial={terrain:'all',style:'all',origin:'Canada',text:'',
  onlyCompatible:false,onlyFavorites:false};
 assert.deepEqual(filterCamoCatalog(initial,[],new Set()),['cadpat-tw']);
 const favorites=filterCamoCatalog({terrain:'woodland',style:'digital',origin:'all',
  text:'',onlyCompatible:true,onlyFavorites:true},headwearCamoChoices('boonie'),
  new Set(['woodland-marpat','cadpat-tw']));
 assert.deepEqual(favorites,['woodland-marpat','cadpat-tw']);
 assert.deepEqual(filterCamoCatalog({terrain:'arid',style:'raindrop',origin:'all',
  text:'',onlyCompatible:false,onlyFavorites:false},[],new Set()),[]);
 const search=filterCamoCatalog({terrain:'all',style:'all',origin:'all',text:'Scorpion',
  onlyCompatible:true,onlyFavorites:false},headwearCamoChoices('boonie'),new Set());
 assert.deepEqual(search,['scorpion-w2']);
});
test('5A historical patterns retain independently recognizable palette structure',()=>{
 const p=HEADWEAR_CAMO_RECIPES;
 assert.ok(headwearCamoCoverage('east-german-strichtarn')[0]>.54);
 assert.equal(p['east-german-strichtarn'].colors.length,3);
 assert.equal(p['russian-emr'].colors.length,4);
 assert.equal(p['cadpat-tw'].colors.length,5);
 assert.equal(p['indian-digital-2022'].colors.length,5);
 assert.equal(p['scorpion-w2'].colors.length,7);
 assert.equal(p['british-mtp'].colors.length,7);
 assert.notDeepEqual(p['scorpion-w2'].colors,p['british-mtp'].colors);
 assert.notDeepEqual(p['scorpion-w2'].motifs,p['british-mtp'].motifs);
 const code=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(code,/Very thin 1px straight vertical rain-stria overprint/);
 assert.match(code,/narrow 1px vertical red-brown rain dashes/);
 assert.match(code,/fractal pixels/);
 assert.match(code,/Original stepped olive\/earth\/buff artwork/);
});

test('5B all twelve master patterns retain distinct art, meaningful ink roles and original registrations',()=>{
 const batch=HEADWEAR_CAMO_IDS.slice(18,30);
 assert.equal(batch.length,12);
 const swatches=new Set();
 const colors=new Set();
 for(const id of batch){
  const recipe=HEADWEAR_CAMO_RECIPES[id],source=headwearCamoPixels(id);
  const signature=Buffer.from(source).toString('base64');
  assert.ok(!swatches.has(signature),id+' must not be a recolor');
  swatches.add(signature);
  for(const rgb of recipe.colors)colors.add(rgb.join(','));
  assert.ok(headwearCamoCoverage(id).filter(c=>c>.045).length>=2,
   id+' needs two visually meaningful pigment fields');
 }
 assert.equal(colors.size,49,'5B must preserve consolidated 49-color twelve-print palette');
 assert.equal(HEADWEAR_CAMO_DENSITY['mitchell-leaf'],2,'Mitchell leaf forms must read on the worn crown');
 assert.equal(headwearCamoSize('east-german-strichtarn'),64,'Strichtarn needs a varied fine 64px repeat');
 assert.equal(HEADWEAR_CAMO_DENSITY['east-german-strichtarn'],2);
 assert.equal(HEADWEAR_CAMO_DENSITY['russian-emr'],3);
 assert.equal(HEADWEAR_CAMO_DENSITY['pla-xingkong'],3);
});
