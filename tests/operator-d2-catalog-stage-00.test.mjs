import test from 'node:test';
import assert from 'node:assert/strict';
import {
 D2_FACEWEAR,D2_EYEWEAR,migrateD2Eyewear,migrateD2Facewear,
 readD2AccessoryOptions,resolveD2HeadAssembly,isD2Facewear,isD2Eyewear
} from '../src/operator-head-accessory-catalog.ts';

test('D2 has exactly nineteen distinguishable catalog models, no duplicates',()=>{
 assert.equal(D2_FACEWEAR.length,12);
 assert.equal(D2_EYEWEAR.length,7);
 const all=[...D2_FACEWEAR,...D2_EYEWEAR];
 assert.equal(new Set(all.map(x=>x.id)).size,19);
 assert.ok(all.every(x=>x.modes.length>0));
 assert.equal(D2_FACEWEAR.filter(x=>x.kind==='fabric').length,6);
 assert.equal(D2_FACEWEAR.filter(x=>x.kind==='full-mask').length,4);
 assert.equal(D2_EYEWEAR.filter(x=>x.kind==='glasses').length,4);
 assert.equal(D2_EYEWEAR.filter(x=>x.kind==='goggles').length,3);
 assert.equal(isD2Facewear('balaclava-one'),true);
 assert.equal(isD2Eyewear('goggles-retro'),true);
});
test('old raised and lowered goggles retain their state during migration',()=>{
 assert.deepEqual(migrateD2Eyewear('goggles-up'),
  {style:'goggles-field',eyePosition:'raised'});
 assert.deepEqual(migrateD2Eyewear('goggles-down'),
  {style:'goggles-field',eyePosition:'eyes'});
 assert.equal(migrateD2Eyewear('sunglasses').style,'glasses-wrap');
 assert.deepEqual(migrateD2Facewear('scarf'),{style:'shemagh',faceMode:'draped'});
 assert.deepEqual(migrateD2Facewear('gas-mask'),{style:'gas-m40',faceMode:'standard'});
});
test('wear positions and fabrics are per-model rather than new catalog items',()=>{
 const valid=readD2AccessoryOptions({
  faceMode:'two-hole',faceSolid:'olive',eyeTint:'smoke',eyeFrame:'black',
  eyePosition:'raised'
 },'balaclava-three','goggles-field');
 assert.equal(valid.faceMode,'two-hole');
 assert.equal(valid.eyePosition,'raised');
 const invalid=readD2AccessoryOptions({
  faceMode:'two-hole',faceSolid:'laser',eyePosition:'raised',
  eyeTint:'purple',faceCamo:'woodland'
 },'gaiter','glasses-shield');
 assert.equal(invalid.faceMode,undefined);
 assert.equal(invalid.faceSolid,undefined);
 assert.equal(invalid.eyePosition,undefined);
 assert.equal(invalid.eyeTint,undefined);
 assert.equal(invalid.faceCamo,'woodland');
});
test('gas masks suppress eyewear without erasing saved preferences',()=>{
 const selection={
  facewear:'gas-m50',eyewear:'goggles-field',headwear:'ach',
  headset:'boom-headset',options:{eyePosition:'raised'}
 };
 const masked=resolveD2HeadAssembly(selection);
 assert.equal(masked.eyewear,'eyes-none');
 assert.equal(masked.headset,'comms-none');
 assert.equal(selection.eyewear,'goggles-field');
 assert.equal(selection.headset,'boom-headset');
 const unmasked=resolveD2HeadAssembly({...selection,facewear:'gaiter'});
 assert.equal(unmasked.eyewear,'goggles-field');
 assert.equal(unmasked.eyewearPlacement,'helmet');
});
test('goggle stow points respect brim and bald-head variants',()=>{
 const p={facewear:'face-none',eyewear:'goggles-retro',
  headset:'comms-none',options:{eyePosition:'raised'}};
 assert.equal(resolveD2HeadAssembly({...p,headwear:'ach'}).eyewearPlacement,'helmet');
 assert.equal(resolveD2HeadAssembly({...p,headwear:'bare'}).eyewearPlacement,'forehead');
 assert.equal(resolveD2HeadAssembly({...p,headwear:'boonie'}).eyewearPlacement,'eyes');
 assert.equal(resolveD2HeadAssembly({...p,headwear:'ach',options:{eyePosition:'neck'}}).eyewearPlacement,'neck');
});
