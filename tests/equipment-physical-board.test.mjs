import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialFieldInventory,moveFieldStack,replaceFieldQuantity,
 fieldQuantity,fieldCarryReport} from '../src/equipment-field-inventory.ts';
import {physicalCarryBoard} from '../src/equipment-physical-board.ts';
const initial=initialEquipmentLoadout();
test('board reports actual occupancy rather than a second independent capacity ledger',()=>{
 const inventory=initialFieldInventory(initial);
 const board=physicalCarryBoard(initial,[],inventory);
 const report=fieldCarryReport(initial,[],inventory);
 assert.deepEqual(board.zones.map(z=>[z.location,z.used,z.capacity]),
  ['rig','belt','pocket','backpack'].map(l=>[l,report.used[l],report.capacity[l]]));
 assert.equal(board.zones.flatMap(z=>z.items).filter(x=>x.itemId==='flashbang')
  .reduce((n,x)=>n+x.quantity,0),1);
 assert.equal(board.unplaced.length,0);
});
test('two actual wedges are never duplicated as an extra utility tool',()=>{
 const kit=setEquipmentChoice(initial,'utility','utility-wedge');
 const inventory=initialFieldInventory(kit);
 const board=physicalCarryBoard(kit,[],inventory);
 assert.equal(fieldQuantity(inventory,'wedge'),2);
 assert.equal(board.zones.flatMap(z=>z.items).filter(t=>t.itemId==='wedge')
  .reduce((n,t)=>n+t.quantity,0),2);
 assert.equal(board.zones.flatMap(z=>z.items).filter(t=>t.id==='utility:utility-wedge').length,0);
});
test('mixed physical placements remain distinct tiles, not silently combined',()=>{
 const base=initialFieldInventory(initial);
 const inventory={version:1,stacks:[
  {itemId:'flashbang',quantity:1,location:'rig'},
  {itemId:'flashbang',quantity:2,location:'backpack'}]};
 const board=physicalCarryBoard(initial,[],inventory);
 assert.equal(board.zones.find(z=>z.location==='rig').items
  .find(t=>t.itemId==='flashbang').quantity,1);
 assert.equal(board.zones.find(z=>z.location==='backpack').items
  .find(t=>t.itemId==='flashbang').quantity,2);
 assert.equal(fieldQuantity(inventory,'flashbang'),3);
 assert.equal(fieldQuantity(base,'flashbang'),1);
});
test('unfitted physical placement is presented, never made free or discarded',()=>{
 const inventory=replaceFieldQuantity(initialFieldInventory(initial),'flashbang',4);
 const moved=moveFieldStack(inventory,'flashbang','rig','belt');
 const board=physicalCarryBoard(initial,[],moved);
 assert.equal(board.valid,false);
 assert.equal(board.zones.find(z=>z.location==='belt').items
  .find(t=>t.itemId==='flashbang').quantity,4);
 assert.ok(board.conflicts.length>0);
});

test('L2.12A: magazine tiles are individually identified and round counts remain unique',()=>{
 const spare=[
  {id:'rook/carbine/0',weapon:'carbine',rounds:30,location:'rig'},
  {id:'rook/carbine/1',weapon:'carbine',rounds:12,location:'backpack'}];
 const board=physicalCarryBoard(initial,spare,initialFieldInventory(initial));
 const magTiles=[...board.zones.flatMap(z=>z.items),...board.unplaced]
  .filter(t=>t.kind==='magazine');
 assert.equal(magTiles.length,2);
 assert.deepEqual(magTiles.map(t=>t.magazineId).sort(),spare.map(m=>m.id));
 assert.ok(magTiles.some(t=>t.label==='MAG 01 · 30 rounds'&&t.location==='rig'));
 assert.ok(magTiles.some(t=>t.label==='MAG 02 · 12 rounds'&&t.location==='backpack'));
 assert.ok(magTiles.every(t=>Number.isFinite(t.accessSeconds)));
});

test('L2.12B: medical and breaching tools carry real footprint and access data',()=>{
 const equipped=setEquipmentChoice(setEquipmentChoice(initial,'medical','medical-trauma'),
  'utility','utility-breach');
 const board=physicalCarryBoard(equipped,[],initialFieldInventory(equipped));
 const tools=[...board.zones.flatMap(z=>z.items),...board.unplaced]
  .filter(x=>x.kind==='medical'||x.kind==='utility');
 const trauma=tools.find(x=>x.id==='medical:medical-trauma');
 const ram=tools.find(x=>x.id==='utility:utility-breach');
 assert.ok(trauma,'actual trauma pack appears exactly once');
 assert.ok(ram,'actual breaching ram appears exactly once');
 assert.equal(trauma.quantity,1);
 assert.equal(trauma.spaces,2);
 assert.equal(ram.spaces,3);
 assert.ok(Number.isFinite(trauma.accessSeconds));
 assert.ok(Number.isFinite(ram.accessSeconds));
 assert.equal(tools.filter(x=>x.id==='utility:utility-breach').length,1);
 assert.equal(tools.filter(x=>x.id==='medical:medical-trauma').length,1);
 assert.equal(board.valid,true);
});
