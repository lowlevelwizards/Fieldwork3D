import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,HEADWEAR_CAMO_SIZE,HEADWEAR_CAMO_DENSITY,
 headwearCamoChoices,headwearCamoIndices,headwearCamoCoverage,
 headwearCamoPixels,resolvedHeadwearCamo} from '../src/operator-headwear-camo.ts';
import {headwearCamoTexture,headwearDetailTexture,headwearFinishTexture}
 from '../src/operator-headwear-materials.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
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
test('five deliberate 32px camo families use fixed opaque canonical colors',()=>{
 assert.equal(HEADWEAR_CAMO_SIZE,32);
 assert.equal(HEADWEAR_CAMO_IDS.length,5);
 const unique=new Set();
 for(const id of HEADWEAR_CAMO_IDS){
  const tile=headwearCamoPixels(id),indices=headwearCamoIndices(id);
  const recipe=HEADWEAR_CAMO_RECIPES[id];
  const coverage=headwearCamoCoverage(id);
  assert.equal(tile.length,32*32*4,id);
  assert.equal(indices.length,1024,id);
  assert.equal(coverage.length,recipe.colors.length,id);
  assert.ok(Math.abs(coverage.reduce((a,b)=>a+b,0)-1)<1e-10,id);
  assert.equal(recipe.targetCoverage.length,coverage.length,id);
  for(let tone=0;tone<coverage.length;tone++)
   assert.ok(Math.abs(coverage[tone]-recipe.targetCoverage[tone])<=.04,
    id+' color '+tone+' must keep authored color proportions');
  assert.ok(coverage.every(n=>n>.01&&n<.80),id+' every authored color must appear');
  assert.ok(recipe.colors.length>=3&&recipe.colors.length<=7,id);
  for(let i=0;i<1024;i++){
   assert.equal(tile[i*4+3],255,id);
   assert.ok(indices[i]<recipe.colors.length,id);
   assert.deepEqual(Array.from(tile.slice(i*4,i*4+3)),recipe.colors[indices[i]],id);
  }
  unique.add(Buffer.from(tile).toString('base64'));
 }
 assert.equal(unique.size,5,'patterns must not be color-only variations of one tile');
});
test('item compatibility is restricted, validated, and persists through outfit serialization',()=>{
 assert.equal(headwearCamoChoices('beanie').length,0);
 assert.equal(headwearCamoChoices('soviet-steel').length,0);
 assert.equal(headwearCamoChoices('bare').length,0);
 assert.deepEqual(headwearCamoChoices('high-cut-rails'),headwearCamoChoices('high-cut'));
 assert.equal(resolvedHeadwearCamo('ach','tiger-stripe'),null);
 assert.equal(resolvedHeadwearCamo('boonie','tiger-stripe'),'tiger-stripe');
 for(const id of HEADWEAR_CAMO_IDS){
  const saved=readWardrobe({...initialWardrobe(),headwearCamo:id});
  assert.equal(saved.headwearCamo,id);
 }
 assert.equal(readWardrobe({...initialWardrobe(),headwearCamo:'unknown'}).headwearCamo,undefined);
});
test('printed camouflage uses a separate 128px UV1 atlas; 1:1 finish remains unchanged',()=>{
 for(const model of ['boonie','ach','high-cut','patrol-cap','pasgt']){
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
test('live pose swaps camo and solid without animation restoring gray or mutating geometry',()=>{
 const rig=createOperatorRig('rook','blue');
 for(const model of ['patrol-cap','boonie','ach','high-cut','pasgt']){
  const {kit,wardrobe}=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'headwear',model);
  const material=rig.visualKit.wardrobeHead.headwearMaterials[model];
  const finish=material.roughnessMap;
  const geo=rig.visualKit.wardrobeHead.headwear[model].children[0].children[0].geometry;
  assert.ok(geo.getAttribute('uv1'),'cloth UVs must survive visual geometry consolidation');
  assert.equal(geo.getAttribute('uv1').count,geo.getAttribute('uv').count);
  for(const id of headwearCamoChoices(model)){
   const selection={...wardrobe,headwearCamo:id};
   poseOperator(rig,pose(kit,selection),0);
   assert.equal(material.map,headwearCamoTexture(model,id));
   assert.equal(material.color.getHex(),0xffffff,model+':'+id);
   poseOperator(rig,pose(kit,selection),0);
   assert.equal(material.map,headwearCamoTexture(model,id),'repeated pose reuses atlas');
   assert.equal(material.roughnessMap,finish,'physical map preserved');
   assert.equal(rig.visualKit.wardrobeHead.headwear[model].children[0].children[0].geometry,geo,
    'no silhouette mutation');
  }
  const solidId=headwearColorChoices(model)[0];
  const solid={...wardrobe,headwearCamo:undefined,headwearColor:solidId};
  poseOperator(rig,pose(kit,solid),0);
  assert.equal(material.map,headwearDetailTexture(model),'solid construction atlas restored');
  assert.equal(material.color.getHex(),HEADWEAR_SOLID_COLORS[solidId].hex);
 }
 rig.dispose();
});
test('operator lab exposes raw art, 3x3 repeat and live selected headwear',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 for(const id of ['headwearCamoGrid','headwearCamoArt','headwearCamoTiled','headwearCamoChoice'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(js,/paintHeadwearCamo\(.*preview,3\)/);
 assert.match(js,/headwearCamo:id/);
 assert.match(js,/headwearCamo:undefined/);
 assert.match(html,/ORIGINAL · 32×32 PIXELS/);
 assert.match(html,/TILED · 3×3 REPEAT/);
 assert.match(html,/fabric-specific print density/);
 assert.match(js,/HEADWEAR_CAMO_DENSITY/);
});
test('pattern family density and pigment scales preserve hierarchy',()=>{
 assert.equal(HEADWEAR_CAMO_DENSITY['m81-woodland'],1);
 assert.equal(HEADWEAR_CAMO_DENSITY['three-color-desert'],1);
 for(const id of ['tiger-stripe','ucp','multicam'])
  assert.equal(HEADWEAR_CAMO_DENSITY[id],2,id);
 assert.equal(HEADWEAR_CAMO_RECIPES.multicam.colors.length,7);
 assert.ok(headwearCamoCoverage('multicam')[5]>.02,'cream chips must be represented');
 assert.ok(headwearCamoCoverage('multicam')[6]>.02,'small dry flecks must survive');
 // UCP should exhibit numerous 1-3 texel transitions in its native tile.
 const pixels=headwearCamoIndices('ucp');
 let transitions=0;
 for(let y=0;y<32;y++)for(let x=1;x<32;x++)
  if(pixels[y*32+x]!==pixels[y*32+x-1])transitions++;
 assert.ok(transitions>100,'UCP must read as fine stair-step digital print');
});
