import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,quoteRosterCarryMigration,readRoster} from '../src/breach-roster.ts';
import {initialEquipmentLoadout,setEquipmentChoice,readEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {quoteSavedCarryMigration,quoteSavedSquadCarryMigration} from '../src/equipment-unified-preparation.ts';
import {fieldQuantity} from '../src/equipment-field-inventory.ts';
function source(){
 const op=initialRoster().members[0];
 let kit=initialEquipmentLoadout(op.weapon);
 for(const [slot,id] of [['rig','rig-none'],['armor','armor-none'],['belt','belt-padded'],['backpack','backpack-day'],['medical','medical-none'],['utility','utility-none']])kit=setEquipmentChoice(kit,slot,id);
 kit.fieldInventory={version:1,stacks:[{itemId:'flashbang',quantity:1,location:'rig'}]};
 return {...op,loadout:kit,wardrobe:undefined,magazines:[],reserve:0};
}
test('BT12 legacy save migration reassigns owned equipment without persisting mission claims',()=>{
 const op=source(),before=structuredClone(op),q=quoteSavedCarryMigration(op);
 assert.ok(q.ok);assert.deepEqual(op,before);
 assert.equal(fieldQuantity(q.operator.loadout.fieldInventory,'flashbang'),1);
 assert.equal(q.operator.loadout.fieldInventory.stacks[0].location,'belt');
 assert.equal(q.operator.loadedMagazineId,op.loadedMagazineId);
 assert.equal(q.operator.magazine,op.magazine);
 assert.equal(q.operator.reserve,op.reserve);
 assert.equal(Object.hasOwn(q.operator,'unifiedCarry'),false);
 const roundTrip=readEquipmentLoadout(JSON.parse(JSON.stringify(q.operator.loadout)),op.weapon,op.id,'unified');
 assert.deepEqual(roundTrip.fieldInventory,q.operator.loadout.fieldInventory);
 assert.equal(quoteSavedCarryMigration(q.operator).ok,true);
});
test('BT12 squad migration is all-or-nothing on unfitted legacy stock',()=>{
 const op=source(),bad={...op,id:'unfit',loadout:setEquipmentChoice(setEquipmentChoice(op.loadout,'belt','belt-none'),'backpack','backpack-none')};
 const members=[op,bad],before=structuredClone(members),q=quoteSavedSquadCarryMigration(members);
 assert.equal(q.ok,false);assert.equal(q.failures[0].id,'unfit');assert.deepEqual(members,before);
 assert.equal(quoteRosterCarryMigration({version:1,members:[op]}).ok,true);
 const loaded=readRoster(JSON.stringify({version:1,members:[op]}),'unified');
 assert.equal(fieldQuantity(loaded.members[0].loadout.fieldInventory,'flashbang'),1);
});
