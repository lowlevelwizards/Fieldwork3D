import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,equipRosterCarryGear,undoRosterCarryGear,copyRosterCarryLayout} from '../src/breach-roster.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {quoteUnifiedFieldCopy} from '../src/equipment-unified-preparation.ts';
import {captureCarryUndo,quoteCarryUndo} from '../src/equipment-carry-undo.ts';
import {fieldQuantity} from '../src/equipment-field-inventory.ts';
function member(){
 const op=initialRoster().members[0];let kit=initialEquipmentLoadout(op.weapon);
 for(const [slot,id] of [['rig','rig-none'],['armor','armor-none'],['belt','belt-padded'],['backpack','backpack-day'],['medical','medical-none'],['utility','utility-none']])kit=setEquipmentChoice(kit,slot,id);
 kit.fieldInventory={version:1,stacks:[]};return {...op,wardrobe:undefined,loadout:kit,magazines:[],reserve:0};
}
test('BT8 copy quantities, never donor location or stock identities',()=>{
 const recipient=member(),donor={...recipient.loadout,fieldInventory:{version:1,stacks:[{itemId:'flashbang',quantity:1,location:'rig'}]}};
 const before=structuredClone(recipient),q=quoteUnifiedFieldCopy(donor,recipient);
 assert.ok(q.ok);assert.equal(fieldQuantity(q.kit.fieldInventory,'flashbang'),1);assert.equal(q.kit.fieldInventory.stacks[0].location,'belt');assert.deepEqual(recipient,before);
});
test('BT8 unified carry undo refits current owned issue and disallows placement-only copy',()=>{
 const op=member(),roster={version:1,members:[op]},before=captureCarryUndo(op.loadout,op.magazines);
 const next=equipRosterCarryGear(roster,op.id,'belt','belt-standard','unified');assert.notEqual(next,roster);
 const m=next.members[0],after=captureCarryUndo(m.loadout,m.magazines);
 const restored=undoRosterCarryGear(next,op.id,after,before,'unified');assert.equal(restored.members[0].loadout.slots.belt,'belt-padded');
 const stale={...before,magazines:[{id:'old',weapon:op.weapon,rounds:3}]};assert.equal(quoteCarryUndo(after,stale,m).ok,false);
 assert.equal(copyRosterCarryLayout(next,'source',op.id,'unified'),next);
});
