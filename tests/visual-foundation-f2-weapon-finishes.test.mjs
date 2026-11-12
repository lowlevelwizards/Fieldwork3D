import test from 'node:test';
import assert from 'node:assert/strict';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';
import * as finishes from '../src/weapons/geometry/weapon-visual-palette.ts';

test('F2.2 all authored AR/AK/HK visual finishes have stable material roles',()=>{
 for(const [name,material] of Object.entries(finishes)){
  const role=visualMaterialRole(material);
  assert.notEqual(role,'neutral',name);
  if(name.includes('WOOD'))assert.equal(role,'wood',name);
  if(name.includes('POLYMER'))assert.equal(role,'polymer',name);
  if(name.includes('METAL')||name.endsWith('_RIB')&&name.includes('MAG'))
   assert.ok(role==='steel'||role==='polymer',name);
 }
 assert.equal(visualMaterialRole(finishes.AK_WARM_RESIN),'polymer');
 assert.equal(visualMaterialRole(finishes.HK_SD_SUPPRESSOR_METAL),'steel');
});
test('F2.2 historically authored palette colors remain unchanged',()=>{
 assert.equal(finishes.AK_WOOD_AMBER.color.getHex(),0xa07842);
 assert.equal(finishes.AK_PLUM_POLYMER.color.getHex(),0x4e3b4c);
 assert.equal(finishes.AR_BLACK_METAL.color.getHex(),0x414a44);
 assert.equal(finishes.HK_OLIVE_POLYMER.color.getHex(),0x60694e);
});
