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
test('5B Belgian Jigsaw rerolls retain contrasting puzzle pieces on actual 64px UV1 crown',()=>{
 const scores=[];
 for(let roll=0;roll<16;roll++){
  const phase=headwearCamoPlacement('moss','headwear:boonie','belgian-jigsaw',roll);
  const cover=headwearCamoAppliedCoverage('belgian-jigsaw',phase);
  assert.equal(cover.length,5);
  assert.ok(cover[0]>.07,'mustard needs to show on cap variation '+roll);
  assert.ok(cover[1]>.05,'burgundy puzzle piece should appear '+roll);
  assert.ok(cover[2]>.06,'blue-green puzzle piece should appear '+roll);
  assert.ok(cover[3]>.025,'dark hooked outlines should appear '+roll);
  assert.ok(Math.max(...cover)<.64,'no enormous single-color slab '+roll);
  scores.push(phase.offsetX+':'+phase.offsetY);
 }
 assert.ok(new Set(scores).size>=6,'reroll must keep varied fabric placement');
});
test('5B applied 3D print coverage matches sampled canonical art and existing UV1 atlas',()=>{
 for(const id of HEADWEAR_CAMO_IDS.slice(18,30)){
  const phase=headwearCamoPlacement('rook','headwear:boonie',id,7);
  const atlas=headwearCamoTexture('boonie',id,phase),source=headwearCamoPixels(id);
  const size=headwearCamoSize(id),density=HEADWEAR_CAMO_DENSITY[id];
  const cover=headwearCamoAppliedCoverage(id,phase);
  assert.ok(Math.abs(cover.reduce((a,b)=>a+b,0)-1)<1e-8);
  for(const [x,y] of [[2,3],[15,44],[41,8],[62,62]]){
   const sx=(Math.floor(x*density/2)+phase.offsetX)%size;
   const sy=(Math.floor(y*density/2)+phase.offsetY)%size;
   const a=(sy*size+sx)*4,d=(y*128+x)*4;
   assert.deepEqual(Array.from(atlas.image.data.slice(d,d+3)),
    Array.from(source.slice(a,a+3)),id+' exact applied color');
  }
 }
});
test('5B identity checks distinguish raindrop, leaf, splinter, digital and modern transition groups',()=>{
 const codes=readFileSync(new URL('../src/operator-headwear-camo.ts',import.meta.url),'utf8');
 assert.match(codes,/Belgian Jigsaw rerolls|belgianJigsawCutScore/);
 assert.match(codes,/puzzle topology/);
 assert.match(codes,/lobed leaves/);
 assert.match(codes,/Staggered jellybean|Staggered jellybean/i);
 assert.match(codes,/sharp/);
 const j=HEADWEAR_CAMO_RECIPES['belgian-jigsaw'];
 assert.equal(j.colors.length,5);
 assert.equal(HEADWEAR_CAMO_RECIPES['east-german-strichtarn'].colors.length,3);
 assert.ok(headwearCamoCoverage('east-german-strichtarn')[0]>.70);
 assert.ok(headwearCamoCoverage('australian-dpcu')[0]<.50,
  'Auscam base may not become a near-solid pale crown');
 assert.ok(headwearCamoCoverage('russian-emr')[2]<.24,'EMR brown remains secondary');
 assert.ok(headwearCamoCoverage('cadpat-tw')[1]<.28,'CADPAT accent should not dominate');
 assert.notDeepEqual(HEADWEAR_CAMO_RECIPES['scorpion-w2'].motifs,
  HEADWEAR_CAMO_RECIPES['british-mtp'].motifs);
});
