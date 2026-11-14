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
test('Flecktarn emphasizes fewer broader base fields with overlaid fine droplets',()=>{
 const r=HEADWEAR_CAMO_RECIPES.flecktarn;
 const macro=r.motifs.slice(0,4);
 assert.equal(macro.length,4);
 assert.deepEqual(macro.map(([ink])=>ink),[1,1,2,2]);
 for(const [tone,polygon] of macro){
  assert.ok(tone===1||tone===2);
  const xs=polygon.filter((_,i)=>i%2===0),ys=polygon.filter((_,i)=>i%2===1);
  assert.ok(Math.max(...xs)-Math.min(...xs)>=18,'wide base fleck field');
  assert.ok(Math.max(...ys)-Math.min(...ys)>=11,'tall base fleck field');
 }
 const coverage=headwearCamoCoverage('flecktarn');
 assert.ok(coverage[0]>.1,'visible base olive field');
 assert.ok(coverage[1]>.2,'deep forest mass still legible');
 assert.ok(coverage[2]>.2,'underlying tan fields remain recognizable');
 assert.ok(coverage[3]+coverage[4]>.34,'retain dense Flecktarn rust and ink droplets');
});

test('4A expanded library preserves native tile scale, print compatibility and palette audit',()=>{
 const six=['erdl-lowland','finnish-m05','polish-pantera','russian-flora',
  'rhodesian-brushstroke','desert-tropentarn'];
 assert.deepEqual(HEADWEAR_CAMO_IDS.slice(12,18),six);
 assert.equal(headwearCamoSize('m81-woodland'),64);
 for(const id of HEADWEAR_CAMO_IDS.slice(0,18).filter(id=>!['m81-woodland','desert-tropentarn'].includes(id)))
  assert.equal(headwearCamoSize(id),32,id);
 assert.equal(headwearCamoSize('desert-tropentarn'),64);
 const oldColors=new Set(HEADWEAR_CAMO_IDS.slice(0,12).flatMap(id=>
  HEADWEAR_CAMO_RECIPES[id].colors.map(c=>c.join(','))));
 const uniqueSignatures=new Set();
 let addedColors=0;
 for(const id of six){
  assert.ok(headwearCamoChoices('boonie').includes(id),id);
  assert.ok(headwearCamoChoices('patrol-cap').includes(id),id);
  assert.ok(headwearCamoCoverage(id).every(v=>v>.015),id+' all pigment roles visible');
  assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:id}).headwearCamo,id);
  const signature=HEADWEAR_CAMO_RECIPES[id].colors.map(c=>c.join(',')).join('|');
  assert.ok(!uniqueSignatures.has(signature),id+' must have an independent palette');
  uniqueSignatures.add(signature);
  if(HEADWEAR_CAMO_RECIPES[id].colors.some(c=>!oldColors.has(c.join(','))))addedColors++;
 }
 assert.equal(addedColors,6,'all six prints merit new pigments rather than forced reuse');
 const allColors=new Set(HEADWEAR_CAMO_IDS.flatMap(id=>
  HEADWEAR_CAMO_RECIPES[id].colors.map(c=>c.join(','))));
 assert.ok(allColors.size>=42,'palette expansion is now allowed where historically justified');

 for(const id of ['erdl-lowland','polish-pantera','desert-tropentarn'])
  assert.equal(HEADWEAR_CAMO_DENSITY[id],2);
 assert.equal(HEADWEAR_CAMO_DENSITY['finnish-m05'],3,'Finnish M05 must have smaller organic motifs');
 for(const id of ['russian-flora','rhodesian-brushstroke'])
  assert.equal(HEADWEAR_CAMO_DENSITY[id],1);
});
test('M81 extended organic master and fine Chocolate Chip flakes retain the correct print scale',()=>{
 assert.ok(HEADWEAR_CAMO_RECIPES['m81-woodland'].motifs.length>=24);
 assert.equal(headwearCamoPixels('m81-woodland').length,64*64*4);
 assert.equal(headwearCamoPixels('six-color-desert').length,32*32*4);
 const chocolate=HEADWEAR_CAMO_RECIPES['six-color-desert'];
 const chips=chocolate.motifs.filter(([tone])=>tone===5);
 assert.ok(chips.length>=10,'chips are numerous small marks, not a handful of rings');
 for(const [,pts] of chips){
  const xs=pts.filter((_,i)=>i%2===0);
  const ys=pts.filter((_,i)=>i%2===1);
  assert.ok(Math.max(...xs)-Math.min(...xs)<=4,'dark chip footprint stays compact');
  assert.ok(Math.max(...ys)-Math.min(...ys)<=4,'dark chip footprint stays compact');
 }
 const tex=headwearCamoTexture('boonie','m81-woodland',
  {offsetX:52,offsetY:46});
 assert.equal(tex.channel,1);
 assert.equal(tex.image.width,128);
 const art=headwearCamoPixels('m81-woodland');
 // At 1x print density, UV1 region art x samples are x/2; phase can
 // cross the old 32px boundary without repeating the first half of the art.
 for(const [x,y] of [[0,0],[12,16],[32,20],[60,60]]){
  const sx=(Math.floor(x/2)+52)%64,sy=(Math.floor(y/2)+46)%64;
  const src=(sy*64+sx)*4,dst=(y*128+x)*4;
  assert.deepEqual(Array.from(tex.image.data.slice(dst,dst+3)),
   Array.from(art.slice(src,src+3)));
 }
});

test('4B Finnish M05 prints genuinely smaller, with distinct patterns/pigments',()=>{
 const id='finnish-m05',density=HEADWEAR_CAMO_DENSITY[id];
 assert.equal(density,3);
 const texture=headwearCamoTexture('boonie',id,{offsetX:0,offsetY:0});
 const art=headwearCamoPixels(id),rgba=texture.image.data;
 for(const [x,y] of [[3,7],[12,13],[25,9],[40,60]]){
  const sx=Math.floor(x*3/2)%32,sy=Math.floor(y*3/2)%32;
  const source=(sy*32+sx)*4,dest=(y*128+x)*4;
  assert.deepEqual(Array.from(rgba.slice(dest,dest+3)),
   Array.from(art.slice(source,source+3)),'3x sampler must actually shrink motifs');
 }
 const arts=HEADWEAR_CAMO_IDS.slice(12,18).map(id=>headwearCamoPixels(id));
 assert.equal(new Set(arts.map(a=>Buffer.from(a).toString('base64'))).size,6);
 const src=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(src,/apply4BDetail/);
 assert.match(src,/camoGrain/);
 assert.match(src,/camoLattice/);
});

