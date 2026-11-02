import test from 'node:test';
import assert from 'node:assert/strict';
import {makeWardrobeLook,importWardrobeLook,exportWardrobeLook}
 from '../src/operator-wardrobe-storage.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
test('bare Lab recipes retain the unarmed display while legacy saves remain valid',()=>{
 const bare=makeWardrobeLook('Bare reference',bareLabEquipment(),
  initialWardrobe(),undefined,false);
 const imported=importWardrobeLook(exportWardrobeLook(bare));
 assert.equal(imported.weaponVisible,false);
 assert.equal(imported.kit.slots.head,'head-none');
 assert.equal(imported.kit.slots.belt,'belt-none');
 const old=makeWardrobeLook('Legacy',bareLabEquipment(),initialWardrobe());
 const {weaponVisible,...oldShape}=old;
 assert.equal(importWardrobeLook(JSON.stringify({
  type:'fieldwork-wardrobe',version:1,look:oldShape
 })).weaponVisible,true);
});
