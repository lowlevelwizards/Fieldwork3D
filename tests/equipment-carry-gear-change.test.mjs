import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialFieldInventory,fieldQuantity,replaceFieldQuantity} from '../src/equipment-field-inventory.ts';
import {previewCarryGearChange} from '../src/equipment-carry-gear-change.ts';
test('losing a rig previews the new capacity and required field relocation',()=>{
 const kit=initialEquipmentLoadout();
 const inventory=initialFieldInventory(kit);
 const quoted=previewCarryGearChange(kit,[],'rig','rig-none',inventory);
 assert.equal(quoted.changed,true);
 assert.equal(quoted.fits,true);
 assert.equal(quoted.requiresRepack,true);
 assert.equal(quoted.capacityDelta.rig,-4);
 assert.equal(quoted.repacked?.valid,true);
 assert.ok(quoted.itemMoves.some(x=>x.id==='flashbang'&&x.from==='rig'));
 assert.equal(fieldQuantity(inventory,'flashbang'),1);
 assert.equal(kit.slots.rig,'rig-light','projection may not author gear choice');
});
test('no feasible carrier refuses to represent overloaded gear as fitted',()=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'belt','belt-none');
 kit=setEquipmentChoice(kit,'backpack','backpack-none');
 const mags=[
  {id:'a',weapon:'carbine',rounds:30},
  {id:'b',weapon:'carbine',rounds:12}];
 const quoted=previewCarryGearChange(kit,mags,'rig','rig-none');
 assert.equal(quoted.fits,false);
 assert.equal(quoted.capacityDelta.rig,-4);
 assert.ok(quoted.issues.length>0);
 assert.ok(quoted.magazineMoves.some(x=>x.to==='overflow'));
});
test('no-op choice previews no displacement or inventory mutation',()=>{
 const kit=initialEquipmentLoadout(),inventory=initialFieldInventory(kit);
 const quoted=previewCarryGearChange(kit,[],'rig',kit.slots.rig,inventory);
 assert.equal(quoted.changed,false);
 assert.equal(quoted.fits,true);
 assert.equal(quoted.requiresRepack,false);
 assert.equal(quoted.itemMoves.length,0);
 assert.deepEqual(Object.values(quoted.capacityDelta),[0,0,0,0]);
});

test('split repacking lists precise quantities for each receiving carrier',()=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'medical','medical-none');
 kit=setEquipmentChoice(kit,'belt','belt-light');
 const inventory=replaceFieldQuantity(initialFieldInventory(kit),'flashbang',2);
 const quoted=previewCarryGearChange(kit,[],'rig','rig-none',inventory);
 assert.equal(quoted.fits,true);
 assert.equal(quoted.requiresRepack,true);
 assert.equal(quoted.itemMoves.reduce((sum,x)=>sum+x.quantity,0),2);
 assert.deepEqual(quoted.itemMoves.filter(x=>x.id==='flashbang')
  .map(x=>[x.from,x.to,x.quantity]).sort(),
  [['rig','backpack',1],['rig','belt',1]].sort());
 assert.equal(fieldQuantity(inventory,'flashbang'),2);
});
