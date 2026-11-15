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
test('4C M81 crown and forward wall remain four-tone across seeded rerolls',()=>{
 const phases=[];
 for(let i=0;i<15;i++){
  const p=headwearCamoPlacement('rook','headwear:boonie','m81-woodland',i);
  phases.push(p);
  const cover=headwearCamoM81CrownCoverage(p);
  assert.ok(cover[3]>=.085,'dark forks must be visible on crown, reroll '+i);
  assert.ok(cover[0]<=.54,'green cannot become a solid panel, reroll '+i);
  assert.ok(cover[2]>=.13,'tan must break up the face of the crown, reroll '+i);
  assert.ok(cover[1]>=.10,'brown must appear somewhere in crown, reroll '+i);
  assert.ok(headwearCamoFrontBrownFraction(p)<=.34,'brown-front limit reroll '+i);
 }
 assert.ok(new Set(phases.map(p=>p.offsetX+':'+p.offsetY)).size>=6);
});
test('4C desert German spot pattern is 64px, three colors and real Flecktarn-family micro rosettes',()=>{
 const id='desert-tropentarn';
 const recipe=HEADWEAR_CAMO_RECIPES[id];
 assert.equal(headwearCamoSize(id),64);
 assert.equal(recipe.colors.length,3,'German desert flecks use sand, brown and green');
 assert.ok(headwearCamoCoverage(id)[0]>.50,'sand must remain negative space');
 assert.ok(headwearCamoCoverage(id)[1]>.12,'brown droplet clusters must register');
 assert.ok(headwearCamoCoverage(id)[2]>.08,'dark olive groupings must register');
 const placement={offsetX:41,offsetY:50},texture=headwearCamoTexture('boonie',id,placement);
 const art=headwearCamoPixels(id);
 for(const [x,y] of [[0,0],[12,12],[32,47],[63,63]]){
  const src=((y+50)%64*64+(x+41)%64)*4;
  const dst=(y*128+x)*4;
  assert.deepEqual(Array.from(texture.image.data.slice(dst,dst+3)),
   Array.from(art.slice(src,src+3)));
 }
 const code=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(code,/Wüstentarn inherits Flecktarn rosettes/);
});
test('4C audited motif families remain distinctive and reference anchored',()=>{
 const recipes=HEADWEAR_CAMO_RECIPES;
 const palettes=HEADWEAR_CAMO_IDS.map(id=>recipes[id].colors.map(c=>c.join(',')).join('/'));
 assert.ok(new Set(palettes).size>=29,'only intentional color similarities may recur');
 assert.equal(HEADWEAR_CAMO_DENSITY['finnish-m05'],3);
 assert.equal(HEADWEAR_CAMO_DENSITY['swedish-m90'],1);
 assert.equal(HEADWEAR_CAMO_DENSITY['woodland-dpm'],1);
 assert.equal(HEADWEAR_CAMO_DENSITY['russian-flora'],1);
 assert.ok(recipes.alpenflage.colors.some(c=>c[0]>140&&c[1]<90),
  'Alpenflage retains its distinct red');
 assert.ok(recipes['woodland-marpat'].colors.length>=4);
 assert.ok(recipes['desert-marpat'].colors.length>=4);
 assert.ok(recipes['six-color-desert'].colors.length>=6);
 const dpmMotifs=recipes['woodland-dpm'].motifs.length;
 assert.ok(dpmMotifs>=20,'British DPM maintains fine branching brushes');
 assert.ok(recipes['m81-woodland'].motifs.length>=30,
  'M81 four-tone connected artwork needs multiple black forks');
});

test('5A adds twelve recognizable global pattern families and authentic print densities',()=>{
 const newIds=['belgian-jigsaw','east-german-strichtarn','mitchell-leaf','splittertarn-31',
  'australian-dpcu','italian-vegetato','scorpion-w2','russian-emr',
  'pla-xingkong','cadpat-tw','british-mtp','indian-digital-2022'];
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(18,30),newIds);
 const signatures=new Set();
 for(const id of newIds){
  const entry=CAMO_CATALOG[id],recipe=HEADWEAR_CAMO_RECIPES[id];
  assert.ok(entry?.terrain&&entry?.style&&entry?.origin,id);
  assert.ok(recipe.motifs.length>=3||id==='east-german-strichtarn',
   id+' must have independent macro fields or an intentional sparse raincloth base');
  assert.ok(recipe.description.length>35);
  assert.ok(headwearCamoChoices('patrol-cap').includes(id));
  assert.ok(headwearCamoChoices('boonie').includes(id));
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  const signature=recipe.colors.map(c=>c.join(',')).join('/')+'|'+
   Buffer.from(headwearCamoIndices(id)).toString('base64');
  assert.ok(!signatures.has(signature),id+' must be distinguishable');
  signatures.add(signature);
  const phase=headwearCamoPlacement('moss','headwear:boonie',id,13);
  const size=headwearCamoSize(id);
  assert.ok(phase.offsetX>=0&&phase.offsetX<size);
  assert.ok(phase.offsetY>=0&&phase.offsetY<size);
  const tex=headwearCamoTexture('boonie',id,phase);
  assert.equal(tex.channel,1);
  assert.equal(tex.magFilter,THREE.NearestFilter);
  assert.equal(tex.image.width,128);
 }
 assert.equal(CAMO_ORIGINS.includes('India'),true);
 assert.equal(CAMO_CATALOG['russian-emr'].style,'digital');
 assert.equal(CAMO_CATALOG['east-german-strichtarn'].style,'raindrop');
 assert.equal(CAMO_CATALOG['splittertarn-31'].style,'geometric');
 assert.equal(CAMO_CATALOG['belgian-jigsaw'].origin,'Belgium');
 assert.equal(CAMO_CATALOG['british-mtp'].terrain,'multi');
 assert.equal(HEADWEAR_CAMO_DENSITY['russian-emr'],3);
 assert.equal(HEADWEAR_CAMO_DENSITY['pla-xingkong'],3);
 assert.equal(headwearCamoSize('scorpion-w2'),64);
 assert.equal(headwearCamoSize('cadpat-tw'),64);
});
