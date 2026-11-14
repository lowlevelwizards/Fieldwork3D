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
test('seven authored auditions are independently structured, correctly dense, and compatible',()=>{
 const newIds=['flecktarn','woodland-dpm','swedish-m90','six-color-desert',
  'woodland-marpat','alpenflage','desert-marpat'];
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(5,12),newIds);
 for(const id of newIds){
  assert.ok(headwearCamoChoices('patrol-cap').includes(id));
  assert.ok(headwearCamoChoices('boonie').includes(id));
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  assert.notDeepEqual(headwearCamoIndices(id),headwearCamoIndices('m81-woodland'));
 }
 for(const id of ['flecktarn','woodland-marpat','desert-marpat'])
  assert.equal(HEADWEAR_CAMO_DENSITY[id],2,'fine printed fabric must be two pixels/unit');
 for(const id of ['woodland-dpm','swedish-m90','six-color-desert','alpenflage'])
  assert.equal(HEADWEAR_CAMO_DENSITY[id],1,'broad motifs must remain one pixel/unit');
 assert.equal(headwearCamoChoices('pasgt').includes('six-color-desert'),true);
 assert.equal(headwearCamoChoices('pasgt').includes('woodland-marpat'),true,
  'PASGT woodland MARPAT was added as an approved textile combination');
 assert.equal(headwearCamoChoices('ach').includes('alpenflage'),false);
 assert.equal(headwearCamoChoices('mich-2001').includes('woodland-dpm'),false);
 assert.equal(headwearCamoChoices('beanie').length,0);
});
test('3C palettes give M81 and DPM distinct identities without recoloring woodland MARPAT',()=>{
 const m81=HEADWEAR_CAMO_RECIPES['m81-woodland'].colors;
 const dpm=HEADWEAR_CAMO_RECIPES['woodland-dpm'].colors;
 const marpat=HEADWEAR_CAMO_RECIPES['woodland-marpat'].colors;
 assert.deepEqual(marpat,[[94,111,77],[138,121,90],[64,83,66],[46,54,44]],
  'MARPAT retains the earthy green/brown palette that already read well');
 assert.deepEqual(m81,[[75,96,74],[100,82,70],[147,137,115],[37,43,40]],
  'M81 must be muted, with brown/green/tan separated by dark ink');
 assert.deepEqual(dpm,[[175,155,105],[87,118,73],[118,85,60],[48,55,39]],
  'DPM warm khaki/green/earth-brown does not borrow MARPAT wash');
 assert.ok(m81[0][1]<dpm[1][1],'M81 olive should be more subdued than DPM');
 assert.ok(m81[2][0]<dpm[0][0],'M81 tan should be more muted than DPM');
 assert.ok(m81[3][0]<dpm[3][0],'M81 charcoal should read as black-branch ink');
 assert.notDeepEqual(m81,dpm);
 assert.notDeepEqual(dpm,marpat);
 const dpmCoverage=headwearCamoCoverage('woodland-dpm');
 assert.ok(dpmCoverage[0]>.20&&dpmCoverage[1]>.25&&dpmCoverage[2]>.25);
 assert.ok(dpmCoverage[3]<.20,'DPM charcoal branches must not dominate');
 assert.ok(HEADWEAR_CAMO_RECIPES['woodland-dpm'].motifs.length>=20,
  'DPM requires distinct thin brushes, khaki negative space and green fingers');
 const chips=HEADWEAR_CAMO_RECIPES['six-color-desert'].colors;
 assert.deepEqual(chips[5],[46,54,44],
  'restore original six-color desert ink; fix darkening in material rather than repainting');
 assert.ok(headwearCamoCoverage('six-color-desert')[4]>.01);
 assert.ok(headwearCamoCoverage('six-color-desert')[5]>.01);
 assert.ok(headwearCamoCoverage('alpenflage')[4]>=.10);
 assert.ok(headwearCamoCoverage('alpenflage')[4]<=.21);
 assert.ok(headwearCamoCoverage('desert-marpat')[0]>.40);
});
test('3C Flecktarn and both MARPATs carry fine dense motifs compared with UCP',()=>{
 const transitions=id=>{
  const pixels=headwearCamoIndices(id);let changes=0;
  const size=headwearCamoSize(id);
  for(let y=0;y<size;y++)for(let x=1;x<size;x++)
   if(pixels[y*size+x]!==pixels[y*size+x-1])changes++;
  return changes;
 };
 const ucp=transitions('ucp');
 assert.ok(ucp>200,'the existing UCP digital density is our reference');
 assert.ok(transitions('flecktarn')>ucp*1.35,'Flecktarn should be denser than UCP');
 assert.ok(transitions('woodland-marpat')>ucp,'woodland MARPAT should be at least as dense as UCP');
 assert.ok(transitions('desert-marpat')>ucp,'desert MARPAT should be at least as dense as UCP');
 assert.ok(transitions('woodland-dpm')/headwearCamoSize('woodland-dpm')>
  transitions('m81-woodland')/headwearCamoSize('m81-woodland'),
  'DPM must have its own more elongated edge language');
 assert.equal(HEADWEAR_CAMO_DENSITY.flecktarn,2);
 assert.equal(HEADWEAR_CAMO_DENSITY['woodland-marpat'],2);
 assert.equal(HEADWEAR_CAMO_DENSITY['desert-marpat'],2);
 const code=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(code,/FLECKTARN_CLUSTERS/);
 assert.match(code,/FLECKTARN_SATELLITES/);
 assert.match(code,/applyMarpatFragments/);
 assert.match(code,/applyFlecktarnSpeckle/);
});

test('3B fabric cut and material channels are consistent for all new prints',()=>{
 const ids=HEADWEAR_CAMO_IDS.slice(5);
 for(const id of ids){
  const first=headwearCamoPlacement('new-operator','headwear:boonie',id,1);
  const again=headwearCamoPlacement('new-operator','headwear:boonie',id,1);
  assert.deepEqual(first,again);
  const tex=headwearCamoTexture('boonie',id,first);
  assert.equal(tex.channel,1);
  assert.equal(tex.image.width,128);
  assert.equal(tex.image.height,128);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex,headwearCamoTexture('boonie',id,first));
 }
 const code=readFileSync(new URL('../src/operator-headwear-materials.ts',import.meta.url),'utf8');
 assert.match(code,/MAX_CACHED_CAMO_CUTS=192/);
 assert.match(code,/evicted\?\.dispose\(\)/);
});

test('3D camo atlas contains authored RGB verbatim while solid structural maps stay intact',()=>{
 for(const camo of ['m81-woodland','woodland-dpm','flecktarn','six-color-desert']){
  const tex=headwearCamoTexture('boonie',camo),rgba=tex.image.data;
  const art=headwearCamoPixels(camo),density=HEADWEAR_CAMO_DENSITY[camo];
  for(let region=0;region<4;region++)for(const y of [0,12,24,40,63])
   for(const x of [0,8,20,36,63]){
    const px=density===1?Math.floor(x/2):x;
    const py=density===1?Math.floor(y/2):y;
    const size=headwearCamoSize(camo);
    const source=((py%size)*size+(px%size))*4;
    const dest=((Math.floor(region/2)*64+y)*128+(region%2)*64+x)*4;
    assert.deepEqual(Array.from(rgba.slice(dest,dest+3)),
     Array.from(art.slice(source,source+3)),camo+' material may not darken ink');
   }
 }
 const solid=headwearDetailTexture('boonie');
 assert.equal(solid.image.width,64);
 assert.ok(solid.image.data.some((n,i)=>i%4===0&&n<250),
  'solids retain their construction-tinted material atlas');
});
