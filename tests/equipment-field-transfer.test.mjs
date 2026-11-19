import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialFieldInventory,fieldQuantity,fieldCarryReport} from '../src/equipment-field-inventory.ts';
import {quoteSingleFieldTransfer} from '../src/equipment-field-transfer.ts';
const kit=initialEquipmentLoadout();
test('a single move splits a three-item stack while preserving stock and original state',()=>{
 const source={version:1,stacks:[{itemId:'flashbang',location:'rig',quantity:3}]};
 const quoted=quoteSingleFieldTransfer(kit,[],source,'flashbang','rig','backpack');
 assert.equal(quoted.ok,true,quoted.ok?'':quoted.reason);
 assert.equal(quoted.changed,true);
 assert.equal(source.stacks[0].quantity,3,'quote never mutates authoritative inventory');
 assert.equal(fieldQuantity(quoted.inventory,'flashbang'),3);
 assert.equal(quoted.inventory.stacks.find(s=>s.location==='rig').quantity,2);
 assert.equal(quoted.inventory.stacks.find(s=>s.location==='backpack').quantity,1);
 assert.equal(fieldCarryReport(kit,[],quoted.inventory).valid,true);
});
test('single move merges into an existing destination stack without duplication',()=>{
 const source={version:1,stacks:[
  {itemId:'flashbang',location:'rig',quantity:2},
  {itemId:'flashbang',location:'backpack',quantity:1}]};
 const quote=quoteSingleFieldTransfer(kit,[],source,'flashbang','rig','backpack');
 assert.equal(quote.ok,true);
 assert.equal(quote.inventory.stacks.find(s=>s.location==='rig').quantity,1);
 assert.equal(quote.inventory.stacks.find(s=>s.location==='backpack').quantity,2);
 assert.equal(quote.inventory.stacks.length,2);
});
test('moving the last individual piece removes the empty source stack',()=>{
 const source=initialFieldInventory(kit);
 const quote=quoteSingleFieldTransfer(kit,[],source,'flashbang','rig','backpack');
 assert.equal(quote.ok,true);
 assert.equal(quote.inventory.stacks.find(s=>s.location==='rig'),undefined);
 assert.equal(fieldQuantity(quote.inventory,'flashbang'),1);
});
test('explicit full destination never repacks, removes or redirects a piece',()=>{
 const withoutBelt=setEquipmentChoice(kit,'belt','belt-none');
 const source=initialFieldInventory(withoutBelt);
 const quote=quoteSingleFieldTransfer(withoutBelt,[],source,
  'flashbang','rig','belt');
 assert.equal(quote.ok,false);
 assert.match(quote.reason,/BELT CAPACITY|NO FITTED/i);
 assert.equal(fieldQuantity(source,'flashbang'),1);
});
test('unavailable gadgets, missing stock and wrong positions reject without writes',()=>{
 const source=initialFieldInventory(kit);
 assert.equal(quoteSingleFieldTransfer(kit,[],source,'smoke','rig','backpack').ok,false);
 assert.equal(quoteSingleFieldTransfer(kit,[],source,'flashbang','pocket','rig').ok,false);
 assert.equal(quoteSingleFieldTransfer(kit,[],source,'flashbang','rig','pocket').ok,false);
 const noop=quoteSingleFieldTransfer(kit,[],source,'flashbang','rig','rig');
 assert.equal(noop.ok,true);
 assert.equal(noop.changed,false);
 assert.equal(noop.inventory,source);
});
test('wedge transfer requires real wedge capability and keeps both pieces',()=>{
 const wedgeKit=setEquipmentChoice(kit,'utility','utility-wedge');
 const source=initialFieldInventory(wedgeKit);
 const quote=quoteSingleFieldTransfer(wedgeKit,[],source,'wedge','belt','backpack');
 assert.equal(quote.ok,true,quote.ok?'':quote.reason);
 assert.equal(fieldQuantity(quote.inventory,'wedge'),2);
 assert.equal(quote.inventory.stacks.find(s=>s.location==='belt').quantity,1);
 assert.equal(quote.inventory.stacks.find(s=>s.location==='backpack').quantity,1);
 const absent=quoteSingleFieldTransfer(kit,[],source,'wedge','belt','backpack');
 assert.equal(absent.ok,false);
});
