import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {visibleFlashCanisters,flashCanisterSocket}
 from '../src/equipment-field-visuals.ts';
import {replaceFieldQuantity,moveFieldStack}
 from '../src/equipment-field-inventory.ts';
const base=initialEquipmentLoadout();
test('legacy saves show one flash, never an arbitrary four',()=>{
 const kit={version:1,slots:{...base.slots}};
 assert.deepEqual(visibleFlashCanisters(kit),[{location:'rig',index:0}]);
 assert.deepEqual(visibleFlashCanisters(kit,0),[]);
});
test('quantity and location map to concrete miniature gear sockets',()=>{
 const inventory=replaceFieldQuantity(base.fieldInventory,'flashbang',4);
 const kit={...base,fieldInventory:moveFieldStack(inventory,'flashbang','rig','backpack')};
 assert.deepEqual(visibleFlashCanisters(kit).map(x=>x.location),
  ['backpack','backpack','backpack','backpack']);
 assert.equal(new Set(visibleFlashCanisters(kit).map(x=>JSON.stringify(
  flashCanisterSocket(x.location,x.index)))).size,4);
});
test('live depletion hides spent devices without altering authored loadout',()=>{
 const kit={...base,fieldInventory:replaceFieldQuantity(base.fieldInventory,'flashbang',4)};
 assert.equal(visibleFlashCanisters(kit).length,4);
 assert.equal(visibleFlashCanisters(kit,2).length,2);
 assert.equal(visibleFlashCanisters(kit,0).length,0);
 assert.equal(visibleFlashCanisters(kit).length,4);
});
test('other field objects and fake smoke never materialize as flashes',()=>{
 const kit={...base,slots:{...base.slots,tactical:'tactical-smoke'},
  fieldInventory:{version:1,stacks:[{itemId:'wedge',quantity:2,location:'belt'}]}};
 assert.equal(visibleFlashCanisters(kit).length,0);
 assert.equal(visibleFlashCanisters(undefined).length,0);
 assert.equal(visibleFlashCanisters(base,NaN).length,1);
});
