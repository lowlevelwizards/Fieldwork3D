import test from 'node:test';
import assert from 'node:assert/strict';
import {WARDROBE_MOUNTS,resolveWardrobeDisplayMount} from '../src/operator-wardrobe-mounts.ts';
test('manual mounts preserve ledger location and reject long thigh tools',()=>{
 assert.equal(new Set(WARDROBE_MOUNTS.map(x=>x.id)).size,WARDROBE_MOUNTS.length);
 assert.equal(resolveWardrobeDisplayMount('medical','belt','medical-belt-left',
  'medical-basic',false).bone,'hip');
 assert.equal(resolveWardrobeDisplayMount('medical','belt','medical-pack-left',
  'medical-basic',true),undefined);
 assert.equal(resolveWardrobeDisplayMount('utility','belt','utility-belt-left',
  'utility-breach',true),undefined);
 assert.equal(resolveWardrobeDisplayMount('utility','backpack','utility-pack-left',
  'utility-breach',false),undefined);
 assert.equal(resolveWardrobeDisplayMount('utility','backpack','utility-pack-left',
  'utility-breach',true).bone,'pack');
});
