import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialFieldInventory,readFieldInventory,fieldQuantity,replaceFieldQuantity,
 fieldCarryReport,autoPackFieldInventory,moveFieldStack} from '../src/equipment-field-inventory.ts';
const standard=initialEquipmentLoadout();
test('legacy one-flash issue migrates without inventing new gear',()=>{
 const kit=initialFieldInventory(standard);
 assert.equal(fieldQuantity(kit,'flashbang'),1);
 assert.equal(fieldQuantity(kit,'smoke'),0);
 assert.equal(fieldCarryReport(standard,[],kit).valid,true);
});
test('wedge tool migration creates two countable physical wedges',()=>{
 const withWedges=setEquipmentChoice(standard,'utility','utility-wedge');
 const migrated=initialFieldInventory(withWedges);
 assert.equal(fieldQuantity(migrated,'wedge'),2);
 assert.equal(fieldCarryReport(withWedges,[],migrated).valid,true);
 const without=setEquipmentChoice(withWedges,'utility','utility-radio');
 assert.equal(fieldQuantity(readFieldInventory(migrated,without),'wedge'),0);
});
test('invalid future devices and duplicate unbounded rows cannot enter stock',()=>{
 const incoming={version:1,stacks:[
  {itemId:'flashbang',quantity:9,location:'rig'},
  {itemId:'flashbang',quantity:4,location:'rig'},
  {itemId:'door-charge',quantity:2,location:'backpack'},
  {itemId:'flashbang',quantity:2,location:'moon'}]};
 const loaded=readFieldInventory(incoming,standard);
 assert.equal(fieldQuantity(loaded,'flashbang'),4);
 assert.equal(fieldQuantity(loaded,'door-charge'),0);
 assert.equal(loaded.stacks.length,1);
});
test('no phantom inventory or silent overflow from quantity changes',()=>{
 let kit=replaceFieldQuantity(initialFieldInventory(standard),'flashbang',4);
 assert.equal(fieldQuantity(kit,'flashbang'),4);
 const report=fieldCarryReport(standard,[],kit);
 assert.equal(report.valid,true);
 const overcrowded={...kit,stacks:[{itemId:'flashbang',quantity:9,location:'rig'}]};
 assert.equal(fieldCarryReport(standard,[],overcrowded).valid,false);
 assert.equal(kit.stacks[0].quantity,4);
});
test('auto-pack remains atomic and never discards an item',()=>{
 let kit=replaceFieldQuantity(initialFieldInventory(standard),'flashbang',4);
 kit=moveFieldStack(kit,'flashbang','rig','belt');
 assert.equal(fieldCarryReport(standard,[],kit).valid,false);
 const packed=autoPackFieldInventory(standard,[],kit);
 assert.ok(packed);
 assert.equal(fieldQuantity(packed,'flashbang'),4);
 assert.equal(fieldCarryReport(standard,[],packed).valid,true);
});

test('versioned legacy loadout retains physical counts and mass',async()=>{
 const {readEquipmentLoadout,totalEquipmentMass,equippedFlashCharges}=
  await import('../src/equipment-loadouts.ts');
 const raw={version:1,slots:{...standard.slots}};
 const upgraded=readEquipmentLoadout(raw,'carbine');
 assert.equal(equippedFlashCharges(upgraded),1);
 assert.equal(fieldQuantity(upgraded.fieldInventory,'flashbang'),1);
 const upgradedAgain=readEquipmentLoadout(JSON.parse(JSON.stringify(upgraded)),'carbine');
 assert.equal(equippedFlashCharges(upgradedAgain),1);
 const kit2={...upgradedAgain,fieldInventory:
  replaceFieldQuantity(upgradedAgain.fieldInventory,'flashbang',2)};
 assert.equal(equippedFlashCharges(kit2),2);
 assert.ok(totalEquipmentMass(kit2)>totalEquipmentMass(upgradedAgain));
});
test('legacy wedge capability follows real finite inventory',async()=>{
 const {issuedWedges}=await import('../src/equipment-entry-tools.ts');
 const withWedges=setEquipmentChoice(standard,'utility','utility-wedge');
 assert.equal(issuedWedges(withWedges),2);
 const emptied={...withWedges,fieldInventory:
  replaceFieldQuantity(withWedges.fieldInventory,'wedge',0,'belt')};
 assert.equal(issuedWedges(emptied),0);
});

test('gadget copying is atomic and does not silently delete unsupported wedges',async()=>{
 const {quoteFieldInventoryCopy}=await import('../src/equipment-field-inventory.ts');
 const sourceKit=setEquipmentChoice(standard,'utility','utility-wedge');
 const source=initialFieldInventory(sourceKit);
 const invalid=quoteFieldInventoryCopy(source,standard,[]);
 assert.equal(invalid.ok,false);
 assert.match(invalid.reason,/wedge/i);
 const valid=quoteFieldInventoryCopy(source,sourceKit,[]);
 assert.equal(valid.ok,true);
 assert.equal(fieldQuantity(valid.inventory,'wedge'),2);
});
test('gadget copying re-packs a stale slot only when destination can fit',async()=>{
 const {quoteFieldInventoryCopy}=await import('../src/equipment-field-inventory.ts');
 const source=replaceFieldQuantity(initialFieldInventory(standard),'flashbang',2);
 const copied=quoteFieldInventoryCopy({...source,stacks:[
  {itemId:'flashbang',quantity:2,location:'belt'}]},standard,[]);
 assert.equal(copied.ok,true);
 assert.equal(fieldQuantity(copied.inventory,'flashbang'),2);
 assert.equal(fieldCarryReport(standard,[],copied.inventory).valid,true);
});
