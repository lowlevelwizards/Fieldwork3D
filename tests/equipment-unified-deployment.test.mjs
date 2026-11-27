import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster} from '../src/breach-roster.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {applyDeploymentInventory,limitDeployedFlashIssue} from '../src/equipment-deployment-snapshot.ts';
import {quoteDeployedFieldUse,spendDeployedFieldItem,restoreDeployedWedge} from '../src/equipment-deployed-field-use.ts';
import {fieldQuantity} from '../src/equipment-field-inventory.ts';
import {quoteManifestRetrieval} from '../src/equipment-unified-placement.ts';
const source=(stacks,utility='utility-none')=>{
 const op=initialRoster().members[0];
 let kit=initialEquipmentLoadout(op.weapon);
 for(const [slot,id] of [['rig','rig-none'],['armor','armor-none'],['belt','belt-padded'],['backpack','backpack-day'],['medical','medical-none'],['utility',utility]])
  kit=setEquipmentChoice(kit,slot,id);
 return {...op,wardrobe:undefined,carryMode:'unified',magazines:[],reserve:0,loadout:{...kit,fieldInventory:{version:1,stacks}}};
};
test('BT4 live field spending keeps empty holder, exact identity, original issue untouched',()=>{
 const src=source([{itemId:'flashbang',quantity:2,location:'rig'}]),copy=structuredClone(src),a={};
 applyDeploymentInventory(a,src);
 assert.ok(a.unifiedCarry);assert.equal(a.flashCharges,2);
 const quote=quoteDeployedFieldUse(a,'flashbang');
 assert.equal(quote.location,'belt');assert.ok(quote.contentId);
 const p=quoteManifestRetrieval(a.unifiedCarry.manifest,quote.contentId).placement;
 assert.equal(spendDeployedFieldItem(a,'flashbang'),true);
 assert.equal(a.flashCharges,1);assert.equal(fieldQuantity(a.equipment.fieldInventory,'flashbang'),1);
 const empty=a.unifiedCarry.manifest.placements.find(x=>x.slotIds.join()===p.slotIds.join());
 assert.equal(empty.itemIds.length,0);assert.equal(empty.holder,'grenade-pouch');
 assert.deepEqual(src,copy);
 limitDeployedFlashIssue(a,0);
 assert.equal(a.unifiedCarry.manifest.placements.flatMap(x=>x.itemIds).filter(x=>x.startsWith('field:flashbang:')).length,0);
 assert.equal(spendDeployedFieldItem(a,'flashbang'),false);
});
test('BT4 wedge returns to an existing empty holder without refitting other equipment',()=>{
 const a={};applyDeploymentInventory(a,source([{itemId:'wedge',quantity:2,location:'belt'}],'utility-wedge'));
 const before=a.unifiedCarry.manifest;
 assert.equal(spendDeployedFieldItem(a,'wedge'),true);
 assert.equal(restoreDeployedWedge(a),true);
 assert.equal(a.wedgeRemaining,2);assert.equal(fieldQuantity(a.equipment.fieldInventory,'wedge'),2);
 assert.deepEqual(a.unifiedCarry.manifest.placements.map(p=>p.slotIds),before.placements.map(p=>p.slotIds));
});
test('BT4 explicit rejected deployment never overwrites actor inventory',()=>{
 const src=source([{itemId:'flashbang',quantity:1,location:'rig'}]);
 src.loadout=setEquipmentChoice(setEquipmentChoice(src.loadout,'belt','belt-none'),'backpack','backpack-none');
 const a={sentinel:true};assert.throws(()=>applyDeploymentInventory(a,src),/UNIFIED CARRY DOES NOT FIT/);
 assert.deepEqual(a,{sentinel:true});
});
test('BT4 legacy deployment explicitly clears old staged reservations',()=>{
 const a={};const src=source([]);
 applyDeploymentInventory(a,src);assert.ok(a.unifiedCarry);
 applyDeploymentInventory(a,{...src,carryMode:undefined});assert.equal(a.unifiedCarry,undefined);
});
