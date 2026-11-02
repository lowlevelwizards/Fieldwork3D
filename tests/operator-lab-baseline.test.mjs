import test from 'node:test';
import assert from 'node:assert/strict';
import {bareLabEquipment,unequipLabAppearance} from '../src/operator-lab-baseline.ts';
import {initialEquipmentLoadout,readEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
test('bare Lab omits all worn and carried equipment without changing spawn defaults',()=>{
 const bare=bareLabEquipment();
 for(const slot of ['head','armor','rig','belt','backpack','top','legs',
 'hands','feet','medical','tactical','utility'])assert.match(bare.slots[slot],/-none$/);
 assert.equal(initialEquipmentLoadout().slots.head,'head-helmet');
 assert.equal(readEquipmentLoadout(bare,'carbine').slots.feet,'feet-none');
 assert.equal(unequipLabAppearance().weaponVisible,false);
 const look=resolvedWardrobe(undefined,bare);
 assert.equal(look.top,'base-layer');assert.equal(look.trousers,'base-shorts');
 assert.equal(look.footwear,'bare-feet');assert.equal(look.beltStyle,'no-belt');
});
