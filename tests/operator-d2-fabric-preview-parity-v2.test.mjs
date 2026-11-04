import test from 'node:test';
import assert from 'node:assert/strict';
import {studioUsesClothesOnly,studioUsesVisibleFace} from '../src/operator-studio-preview-policy.ts';
test('D2-F0 facewear thumbnails strip the same kit overlays as the live Studio view',()=>{
 for(const slot of ['top','trousers','facewear']){
  assert.equal(studioUsesClothesOnly(slot),true,slot);
 }
 for(const slot of ['headwear','eyewear','headset','rigStyle','armorStyle','beltStyle','packStyle','footwear']){
  assert.equal(studioUsesClothesOnly(slot),false,slot);
 }
 assert.equal(studioUsesVisibleFace('facewear'),true);
 assert.equal(studioUsesVisibleFace('headwear'),false);
});
