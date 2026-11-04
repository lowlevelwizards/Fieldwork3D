import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWardrobe,setWardrobeStyle}
 from '../src/operator-wardrobe-data.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {appearanceThumbnailContext,appearanceThumbnailKey}
 from '../src/operator-appearance-thumbnail-context.ts';
const kit=bareLabEquipment();
const wardrobe=initialWardrobe();
const key=(w,id,slot='facewear')=>appearanceThumbnailKey(
 appearanceThumbnailContext(kit,w,slot,id,true),slot,id,'rook',true);
test('switching facewear selection does not invalidate other facewear cards',()=>{
 const a=setWardrobeStyle(wardrobe,'facewear','balaclava-one');
 const b=setWardrobeStyle(wardrobe,'facewear','balaclava-three');
 for(const id of ['balaclava-one','balaclava-three','gaiter','shemagh']){
  assert.equal(key(a,id),key(b,id),id);
 }
 assert.notEqual(key(a,'balaclava-one'),key(a,'balaclava-three'));
});
test('changing a visible material preserves correctness by invalidating the card',()=>{
 const base=setWardrobeStyle(wardrobe,'facewear','gaiter');
 const tinted={...base,d2FaceSolid:'olive'};
 assert.notEqual(key(base,'gaiter'),key(tinted,'gaiter'));
 assert.notEqual(key(base,'gaiter'),appearanceThumbnailKey(
  appearanceThumbnailContext(kit,base,'facewear','gaiter',true),
  'facewear','gaiter','different-operator',true));
});
test('preview-only gear removal happens before hashing, preserving thumbnail parity',()=>{
 const a=appearanceThumbnailContext(kit,wardrobe,'facewear','gaiter',true);
 const b=appearanceThumbnailContext(kit,
  setWardrobeStyle(wardrobe,'headwear','pasgt'),
  'facewear','gaiter',true);
 assert.equal(a.kit.slots.head,'head-none');
 assert.equal(b.wardrobe.styles.headwear,'bare');
 assert.equal(appearanceThumbnailKey(a,'facewear','gaiter','rook',true),
  appearanceThumbnailKey(b,'facewear','gaiter','rook',true));
});
test('non-Studio thumbnails use stable neutral rig independent of editor context',()=>{
 const a=appearanceThumbnailContext(kit,wardrobe,'facewear','gaiter',false);
 const b=appearanceThumbnailContext(kit,
  setWardrobeStyle(wardrobe,'facewear','shemagh'),'facewear','gaiter',false);
 assert.equal(appearanceThumbnailKey(a,'facewear','gaiter','rook',false),
  appearanceThumbnailKey(b,'facewear','gaiter','rook',false));
});
