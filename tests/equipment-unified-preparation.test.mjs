import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteUnifiedPreparation,unifiedPreparationSummary} from '../src/equipment-unified-preparation.ts';
import {initialRoster,equipRosterCarryGear,equipRosterFieldInventory} from '../src/breach-roster.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {fieldQuantity} from '../src/equipment-field-inventory.ts';
function source(){
 const op=initialRoster().members[0];
 let kit=initialEquipmentLoadout(op.weapon);
 for(const [slot,id] of [['rig','rig-none'],['armor','armor-none'],['belt','belt-padded'],['backpack','backpack-day'],['medical','medical-none'],['utility','utility-none']])
  kit=setEquipmentChoice(kit,slot,id);
 kit.fieldInventory={version:1,stacks:[]};
 return {...op,loadout:kit,wardrobe:undefined,magazines:[],reserve:0};
}
test('BT4 preparation automatically fits stock, rejects impossible removals without editing source',()=>{
 const op=source(),before=structuredClone(op);
 const q=quoteUnifiedPreparation(op,{kind:'field',inventory:{version:1,stacks:[{itemId:'flashbang',quantity:2,location:'rig'}]}});
 assert.ok(q.ok);assert.equal(fieldQuantity(q.kit.fieldInventory,'flashbang'),2);
 const summary=unifiedPreparationSummary(q.input,q.manifest);assert.equal(summary.find(p=>p.carrier==='belt').total,7);
 assert.equal(summary.find(p=>p.carrier==='belt').items,2);
 assert.deepEqual(op,before);
 const bare={...op,loadout:setEquipmentChoice(setEquipmentChoice(op.loadout,'belt','belt-none'),'backpack','backpack-none')};
 assert.equal(quoteUnifiedPreparation(bare,{kind:'field',inventory:q.kit.fieldInventory}).ok,false);
});
test('BT4 roster owner can commit automatic field fit or reject it atomically',()=>{
 const op=source(),roster={version:1,members:[op]};
 const next=equipRosterFieldInventory(roster,op.id,{version:1,stacks:[{itemId:'flashbang',quantity:1,location:'rig'}]},'unified');
 assert.notEqual(next,roster);assert.equal(fieldQuantity(next.members[0].loadout.fieldInventory,'flashbang'),1);
 const noPack=equipRosterCarryGear(next,op.id,'backpack','backpack-none','unified');
 assert.notEqual(noPack,next);
 const denied=equipRosterCarryGear(noPack,op.id,'belt','belt-none','unified');
 assert.equal(denied,noPack);
 assert.equal(fieldQuantity(roster.members[0].loadout.fieldInventory,'flashbang'),0);
});
