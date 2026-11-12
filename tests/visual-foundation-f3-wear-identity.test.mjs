import test from 'node:test';
import assert from 'node:assert/strict';
import {ageMaterialColor} from '../src/rendering/condition-materials.ts';

const channels=(c)=>[(c>>>16)&255,(c>>>8)&255,c&255];
test('F3.3 clean paints and historical source finishes are unchanged',()=>{
 for(const surface of ['metal','wood','fabric','plastic','porcelain',
  'painted-metal','concrete']){
  assert.equal(ageMaterialColor(0x8a7058,surface,0),0x8a7058,surface);
  assert.equal(ageMaterialColor(0x8a7058,surface,-2),0x8a7058,surface);
 }
});
test('F3.3 substrate-specific aging is bounded and preserves cool metal/stone',()=>{
 const base=0xb9ac94;
 const steel=ageMaterialColor(base,'industrial-steel',90);
 const wood=ageMaterialColor(base,'furniture-wood',90);
 const ceramic=ageMaterialColor(base,'porcelain',90);
 assert.notEqual(steel,wood);
 assert.notEqual(steel,ceramic);
 assert.ok(channels(steel)[1]>=channels(steel)[0]-4);
 assert.ok(channels(wood)[0]>channels(wood)[2]);
 for(const surface of ['industrial-steel','furniture-wood','porcelain']){
  const aged=ageMaterialColor(base,surface,100,1);
  assert.equal(aged,ageMaterialColor(base,surface,100,1));
  assert.ok(channels(aged).every(c=>c>=0&&c<=255));
 }
});
