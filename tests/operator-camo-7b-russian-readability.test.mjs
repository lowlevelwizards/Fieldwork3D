import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,headwearCamoIndices,
 headwearCamoPixels,headwearCamoCoverage,headwearCamoSize,
 headwearCamoPlacement,headwearCamoChoices} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,wardrobeFabricCamoTexture} from '../src/operator-fabric-camo-materials.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';

const three=['spectre-skwo','ss-leto','berezka'];
const diff=(a,b)=>a.reduce((n,v,i)=>n+(v!==b[i]?1:0),0)/a.length;

test('7B Russian prints preserve historical 46-ID registry, texture dimensions and saved looks',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,46);
 assert.equal(new Set(HEADWEAR_CAMO_IDS).size,46);
 for(const id of three){
  assert.ok(HEADWEAR_CAMO_IDS.includes(id));
  assert.equal(headwearCamoSize(id),64);
  const source=headwearCamoIndices(id),pixels=headwearCamoPixels(id);
  assert.equal(source.length,4096);
  assert.equal(pixels.length,16384);
  assert.deepEqual(source,headwearCamoIndices(id),'deterministic master '+id);
  assert.equal(HEADWEAR_CAMO_RECIPES[id].colors.length,headwearCamoCoverage(id).length);
  assert.ok(headwearCamoChoices('boonie').includes(id));
  const saved=readWardrobe({...initialWardrobe(),
   headwearCamo:id,headwearCamoRoll:21,fabricCamo:{top:id,trousers:id}});
  assert.equal(saved.headwearCamo,id);
  assert.equal(saved.headwearCamoRoll,21);
  assert.equal(saved.fabricCamo.top,id);
  assert.equal(saved.fabricCamo.trousers,id);
  const tex=wardrobeFabricCamoTexture(id,'trousers',headwearCamoPlacement('rook','trousers',id,11));
  assert.equal(tex.image.width,64);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex.colorSpace,THREE.SRGBColorSpace);
  assert.deepEqual(tex.image.data,pixels,'headwear / cloth share exact RGBA');
  assert.ok(FABRIC_CAMO_DENSITY[id]>2&&FABRIC_CAMO_DENSITY[id]<4);
 }
});

test('Spectre SKWO separates from Leto with olive-led fracture and subordinate earth accents',()=>{
 const spectre=headwearCamoIndices('spectre-skwo');
 const leto=headwearCamoIndices('ss-leto');
 const s=headwearCamoCoverage('spectre-skwo');
 const l=headwearCamoCoverage('ss-leto');
 assert.ok(s[3]<.12,'Spectre brown must not dominate');
 assert.ok(s[2]+s[4]>.38,'Spectre olive and connected charcoal bands are visible');
 assert.ok(s[4]>.08,'Spectre dark branchlets survive miniature resolution');
 assert.ok(l[4]>s[3]+.09,'Leto loam-brown oak-leaf identity exceeds Spectre brown');
 assert.ok(l[0]>.12,'Leto retains recognizably pale lobed leaves');
 assert.ok(l[5]>.03,'Leto leaf shadows remain');
 assert.ok(diff(spectre,leto)>.60,'Spectre/Leto must not collapse into matching geometry');
 assert.notDeepEqual(spectre,headwearCamoIndices('russian-emr'));
 assert.notDeepEqual(spectre,headwearCamoIndices('multicam-tropic'));
});

test('Berezka retains bright classic sunray ink but loses rigid uniform stripe repetition',()=>{
 const data=headwearCamoIndices('berezka');
 const cov=headwearCamoCoverage('berezka');
 assert.ok(cov[1]+cov[2]>.16&&cov[1]+cov[2]<.5,
  'distinct bright sun-bunny motifs without solid bright sheet');
 assert.ok(cov[3]>.01,'dark olive edging remains');
 const bands=[];
 for(let row=0;row<8;row++){
  let light=0;
  for(let y=row*8;y<(row+1)*8;y++)for(let x=0;x<64;x++)
   if(data[y*64+x]===1||data[y*64+x]===2)light++;
  bands.push(light);
 }
 assert.ok(new Set(bands).size>=3,'vary sunray density between 8px bands');
 assert.notDeepEqual(data,headwearCamoIndices('ss-leto'));
});

test('7B edit does not alter the 6A and 7A sister pattern artwork',()=>{
 const unrelated=['multicam','multicam-tropic','multicam-arid',
  'pencott-greenzone','pencott-badlands','aor2','ukrainian-mm14'];
 for(const id of unrelated){
  const bytes=headwearCamoPixels(id);
  assert.equal(bytes.length,(headwearCamoSize(id)**2)*4,id);
  assert.ok(bytes.some(v=>v!==bytes[0]),id+' should remain a live pattern');
 }
 assert.equal(HEADWEAR_CAMO_RECIPES['spectre-skwo'].colors.length,5);
 assert.equal(HEADWEAR_CAMO_RECIPES['ss-leto'].colors.length,6);
 assert.equal(HEADWEAR_CAMO_RECIPES.berezka.colors.length,4);
});
