import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWardrobeLook,readWardrobeLooks,exportWardrobeLook,
 importWardrobeLook} from '../src/operator-wardrobe-storage.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
test('outfits serialize as bounded recipes without changing ownership',()=>{
 const look=makeWardrobeLook('My civilian scout',initialEquipmentLoadout(),
  setWardrobeStyle(initialWardrobe(),'top','flannel'));
 const exported=exportWardrobeLook(look);
 assert.equal(importWardrobeLook(exported).wardrobe.styles.top,'flannel');
 assert.equal(importWardrobeLook('oops'),null);
 assert.equal(importWardrobeLook(JSON.stringify({type:'other',version:1,look})),null);
 assert.equal(readWardrobeLooks([look,look]).length,1);
 assert.equal(readWardrobeLooks(Array(100).fill(look)).length,1);
 const imported=importWardrobeLook(exported);
 assert.equal(imported.kit.slots.primary,'primary-carbine');
 assert.equal(imported.id,look.id);
});
