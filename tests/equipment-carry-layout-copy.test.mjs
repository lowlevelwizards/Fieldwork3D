import test from 'node:test';import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialFieldInventory,fieldQuantity,moveFieldStack}
 from '../src/equipment-field-inventory.ts';
import {quoteCarryLayoutCopy} from '../src/equipment-carry-layout-copy.ts';
test('copy pouch positions without transferring ammo, magazine IDs, equipment or stock',()=>{
 const sourceKit=initialEquipmentLoadout(),targetKit=initialEquipmentLoadout();
 const sourceMags=[{id:'a',weapon:'carbine',rounds:30,location:'backpack'}];
 const targetMags=[{id:'z',weapon:'carbine',rounds:9,location:'rig'}];
 const result=quoteCarryLayoutCopy(sourceKit,sourceMags,targetKit,targetMags);
 assert.equal(result.ok,true,result.ok?'':result.reason);
 assert.equal(result.magazines[0].id,'z');assert.equal(result.magazines[0].rounds,9);
 assert.equal(result.magazines[0].location,'backpack');
 assert.equal(result.loadout.slots.rig,targetKit.slots.rig);
 assert.equal(fieldQuantity(result.loadout.fieldInventory,'flashbang'),1);
 assert.deepEqual(targetMags,[{id:'z',weapon:'carbine',rounds:9,location:'rig'}]);
});
test('unequal gadget supply is rejected, never cloned from source operator',()=>{
 const sourceKit=initialEquipmentLoadout(),targetKit=initialEquipmentLoadout();
 const target={...targetKit,fieldInventory:{version:1,stacks:[]}};
 const result=quoteCarryLayoutCopy(sourceKit,[],target,[]);
 assert.equal(result.ok,false);assert.match(result.reason,/DIFFERENT FLASHBANG COUNT/);
});
test('destination carrier and weapon mismatches fail instead of repacking',()=>{
 const source=initialEquipmentLoadout();
 const withoutPack=setEquipmentChoice(initialEquipmentLoadout(),'backpack','backpack-none');
 const a=[{id:'a',weapon:'carbine',rounds:30,location:'backpack'}];
 assert.equal(quoteCarryLayoutCopy(source,a,withoutPack,
  [{id:'b',weapon:'carbine',rounds:6,location:'rig'}]).ok,false);
 assert.equal(quoteCarryLayoutCopy(source,a,source,
  [{id:'b',weapon:'smg',rounds:6,location:'rig'}]).ok,false);
});
test('field placement copies only existing units and preserves counts',()=>{
 const base=initialEquipmentLoadout();
 const relocated=moveFieldStack(initialFieldInventory(base),'flashbang','rig','backpack');
 const source={...base,fieldInventory:relocated};
 const result=quoteCarryLayoutCopy(source,[],base,[]);
 assert.equal(result.ok,true,result.ok?'':result.reason);
 assert.equal(result.loadout.fieldInventory.stacks[0].location,'backpack');
 assert.equal(result.moves.filter(x=>x.kind==='field').length,1);
 assert.equal(base.fieldInventory.stacks[0].location,'rig');
});
