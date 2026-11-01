import test from 'node:test';
import assert from 'node:assert/strict';
import {pixelPattern,PIXEL_SURFACES,MATERIAL_RECIPE_VERSION} from '../src/rendering/pixel-recipes.ts';
import {materialProfile} from '../src/rendering/pixel-profiles.ts';
test('each material has a declared structure and contrast budget',()=>{
 assert.ok(MATERIAL_RECIPE_VERSION>=3);
 for(const kind of PIXEL_SURFACES){
  const profile=materialProfile(kind);
  assert.ok(profile.maxDarkening<=50,kind);
  const texture=pixelPattern(kind,4);
  const min=Math.min(...Array.from({length:texture.length/4},(_,i)=>texture[i*4]));
  assert.ok(255-min<=profile.maxDarkening+2,kind);
 }
});
test('clean materials are visually flat and structural joints legible',()=>{
 for(const kind of ['plaster','paper','fabric','carpet'])
  assert.ok(pixelPattern(kind).every((x,i)=>i%4===3?x===255:x>=250));
 assert.notDeepEqual(pixelPattern('wood',0),pixelPattern('tile',0));
 assert.notDeepEqual(pixelPattern('brick',0),pixelPattern('tile',0));
});
