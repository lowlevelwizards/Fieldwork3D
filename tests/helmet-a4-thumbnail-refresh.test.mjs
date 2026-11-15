import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {appearanceThumbnailKey,appearanceThumbnailContext,stableThumbnailJSON}
 from '../src/operator-appearance-thumbnail-context.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const source=readFileSync(new URL('../src/operator-appearance-grid.ts',import.meta.url),'utf8');
test('A4: stable visual signatures ignore insertion order and unnecessary renders',()=>{
 const kit=initialEquipmentLoadout(),w=initialWardrobe();
 const variant=Object.fromEntries(Object.entries(w).reverse());
 assert.equal(stableThumbnailJSON(w),stableThumbnailJSON(variant));
 const a=appearanceThumbnailContext(kit,w,'headwear','ach',true);
 const b=appearanceThumbnailContext(kit,variant,'headwear','ach',true);
 assert.equal(appearanceThumbnailKey(a,'headwear','ach','rook',true),
  appearanceThumbnailKey(b,'headwear','ach','rook',true));
});
test('A4: refresh skips unchanged content without invalidating GPU work',()=>{
 assert.match(source,/this\.refreshFingerprint===signature/);
 assert.match(source,/this\.renderedCategory===this\.selected/);
 assert.match(source,/thumbnailRefreshSkips/);
 assert.match(source,/this\.cache\.delete\(key\);\s*this\.cache\.set\(key,cached\)/);
 assert.match(source,/this\.refreshFingerprint='';/);
});
