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
test('forty-six independently authored 32/64px camo families use fixed opaque canonical colors',()=>{
 assert.equal(HEADWEAR_CAMO_SIZE,32);
 assert.equal(HEADWEAR_CAMO_IDS.length,62);
 const unique=new Set();
 for(const id of HEADWEAR_CAMO_IDS){
  const tile=headwearCamoPixels(id),indices=headwearCamoIndices(id);
  const recipe=HEADWEAR_CAMO_RECIPES[id];
  const coverage=headwearCamoCoverage(id);
  const native=headwearCamoSize(id);
  assert.ok(native===32||native===64,id+' permitted master size');
  assert.equal(tile.length,native*native*4,id);
  assert.equal(indices.length,native*native,id);
  assert.equal(coverage.length,recipe.colors.length,id);
  assert.ok(Math.abs(coverage.reduce((a,b)=>a+b,0)-1)<1e-10,id);
  assert.equal(recipe.targetCoverage.length,coverage.length,id);
  for(let tone=0;tone<coverage.length;tone++)
   assert.ok(Math.abs(coverage[tone]-recipe.targetCoverage[tone])<=.035,
    id+' color '+tone+' must keep measured authored color proportions');
  assert.ok(coverage.every(n=>n>.01&&n<(id==='east-german-strichtarn'?.90:.80)),
   id+' all ink tones must appear (raincloth may be mostly neutral)');
  assert.ok(recipe.colors.length>=(id==='british-desert-dpm'?2:3)&&recipe.colors.length<=7,
   id+' must retain its authentic ink count (British Desert DPM is two-color)');
  for(let i=0;i<indices.length;i++){
   assert.equal(tile[i*4+3],255,id);
   assert.ok(indices[i]<recipe.colors.length,id);
   assert.deepEqual(Array.from(tile.slice(i*4,i*4+3)),recipe.colors[indices[i]],id);
  }
  unique.add(Buffer.from(tile).toString('base64'));
 }
 assert.equal(unique.size,62,'patterns must not be color-only variations of one tile');
});
test('item compatibility is restricted, validated, and persists through outfit serialization',()=>{
 assert.equal(headwearCamoChoices('beanie').length,0);
 assert.equal(headwearCamoChoices('soviet-steel').length,0);
 assert.equal(headwearCamoChoices('bare').length,0);
 assert.ok(headwearCamoChoices('mich-2001').includes('multicam'));
 assert.equal(resolvedHeadwearCamo('ach','tiger-stripe'),null);
 assert.equal(resolvedHeadwearCamo('boonie','tiger-stripe'),'tiger-stripe');
 for(const id of HEADWEAR_CAMO_IDS){
  const saved=readWardrobe({...initialWardrobe(),headwearCamo:id});
  assert.equal(saved.headwearCamo,id);
 }
 assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:'unknown'}).headwearCamo,undefined);
});
test('printed camouflage uses a separate 128px UV1 atlas; 1:1 finish remains unchanged',()=>{
 for(const model of ['boonie','ach','mich-2001','patrol-cap','pasgt']){
  const id=headwearCamoChoices(model)[0],texture=headwearCamoTexture(model,id);
  assert.equal(texture.image.width,128);
  assert.equal(texture.image.height,128);
  assert.equal(texture.magFilter,THREE.NearestFilter);
  assert.equal(texture.channel,1,'camo must use independent sewn fabric UV1');
  assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
  assert.equal(texture.wrapS,THREE.ClampToEdgeWrapping);
  assert.equal(texture,headwearCamoTexture(model,id),'cache by model and camo');
  assert.equal(headwearDetailTexture(model).image.width,64,'structural pixels remain 1:1');
  assert.notEqual(texture,headwearDetailTexture(model));
  assert.equal(headwearFinishTexture(model),headwearFinishTexture(model));
  const pixels=texture.image.data;
  const rgb=new Set();
  for(let i=0;i<pixels.length;i+=4){
   assert.equal(pixels[i+3],255);
   rgb.add(pixels.slice(i,i+3).join(','));
  }
  assert.ok(rgb.size>=3,model+' must visibly contain multiple colored fields');
 }
});
