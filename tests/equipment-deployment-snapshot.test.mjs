import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialRoster} from '../src/breach-roster.ts';
import {newCampaign} from '../src/campaign-state.ts';
import {captureDeploymentInventory,applyDeploymentInventory,
 limitDeployedFlashIssue} from '../src/equipment-deployment-snapshot.ts';
import {fieldQuantity} from '../src/equipment-field-inventory.ts';
import {stageMagazines} from '../src/equipment-magazine-placement.ts';

test('F1 Quick Play snapshot carries exact magazine identities, rounds and fitted locations',()=>{
 const op=initialRoster().members[0];
 const source={...op,
  loadout:{...op.loadout,fieldInventory:{version:1,stacks:[
   {itemId:'flashbang',quantity:2,location:'rig'},
   {itemId:'zip-tie',quantity:1,location:'pocket'}]}}};
 const original=structuredClone(source);
 const snapshot=captureDeploymentInventory(source);
 assert.deepEqual(snapshot.spareMagazines,stageMagazines(op.magazines,op.loadout));
 assert.equal(snapshot.reserve,snapshot.spareMagazines.reduce((n,m)=>n+m.rounds,0));
 assert.equal(snapshot.insertedMagazineId,op.loadedMagazineId);
 assert.equal(snapshot.magazine,op.magazine);
 assert.equal(snapshot.flashCharges,2);
 assert.equal(snapshot.restraintRemaining,1);
 assert.equal(fieldQuantity(snapshot.equipment.fieldInventory,'zip-tie'),1);
 assert.deepEqual(snapshot.equipment.slots,source.loadout.slots);
 assert.notStrictEqual(snapshot.equipment,source.loadout);
 assert.notStrictEqual(snapshot.equipment.slots,source.loadout.slots);
 assert.notStrictEqual(snapshot.equipment.fieldInventory,source.loadout.fieldInventory);
 assert.notStrictEqual(snapshot.equipment.fieldInventory.stacks[0],
  source.loadout.fieldInventory.stacks[0]);
 assert.deepEqual(snapshot.weaponConfiguration,source.weaponConfiguration);
 assert.notStrictEqual(snapshot.weaponConfiguration,source.weaponConfiguration);
 snapshot.spareMagazines[0].rounds=0;
 snapshot.equipment.fieldInventory.stacks[0].quantity=0;
 snapshot.equipment.slots.rig='rig-none';
 assert.deepEqual(source,original,'live mission must not alter the saved preparation kit');
});

test('F1 Campaign deployment preserves depleted medical inventory and true flash issue',()=>{
 const op=newCampaign(44).operators[0];
 const source={...op,
  medicalSupplies:{'tourniquet':0,'field-dressing':1,'trauma-dressing':0},
  loadout:{...op.loadout,fieldInventory:{version:1,stacks:[
   {itemId:'flashbang',quantity:3,location:'rig'},
   {itemId:'zip-tie',quantity:2,location:'pocket'}]}}};
 const actor={};
 const snapshot=applyDeploymentInventory(actor,source);
 assert.deepEqual(actor.medicalSupplies,source.medicalSupplies);
 assert.deepEqual(actor.spareMagazines,snapshot.spareMagazines);
 assert.equal(actor.flashCharges,3);
 assert.equal(actor.restraintRemaining,2);
 assert.deepEqual(actor.weaponConfiguration,source.weaponConfiguration);
 assert.notStrictEqual(actor.weaponConfiguration,source.weaponConfiguration);
 assert.equal(actor.weaponLightOn,source.weaponConfiguration.slots.light==='light-compact');
 limitDeployedFlashIssue(actor,1);
 assert.equal(actor.flashCharges,1);
 assert.equal(fieldQuantity(actor.equipment.fieldInventory,'flashbang'),1);
 assert.equal(fieldQuantity(actor.equipment.fieldInventory,'zip-tie'),2);
 assert.equal(fieldQuantity(source.loadout.fieldInventory,'flashbang'),3);
 assert.equal(actor.spareMagazines.reduce((sum,m)=>sum+m.rounds,0),source.reserve);
 limitDeployedFlashIssue(actor,0);
 assert.equal(fieldQuantity(actor.equipment.fieldInventory,'flashbang'),0);
 assert.equal(fieldQuantity(source.loadout.fieldInventory,'flashbang'),3);
});

test('F1 older kits migrate once without creating cuffs or future gadgets',()=>{
 const op=initialRoster().members[0];
 const kit={...op.loadout,fieldInventory:undefined};
 const snapshot=captureDeploymentInventory({...op,loadout:kit});
 assert.equal(snapshot.flashCharges,1);
 assert.equal(snapshot.restraintRemaining,0);
 assert.equal(fieldQuantity(snapshot.equipment.fieldInventory,'smoke'),0);
 assert.equal(fieldQuantity(snapshot.equipment.fieldInventory,'frag'),0);
 assert.equal(snapshot.reserve,op.reserve);
});

test('F1 shotgun deployment remains shell-backed without invented magazines',()=>{
 const op=initialRoster().members[3];
 assert.equal(op.weapon,'shotgun');
 const actor={};
 applyDeploymentInventory(actor,op);
 assert.deepEqual(actor.spareMagazines,[]);
 assert.equal(actor.reserve,op.reserve);
 assert.equal(actor.magazine,op.magazine);
});

test('F1 both deployment adapters use shared handoff, not saved kit references',()=>{
 const roster=readFileSync(new URL('../src/breach-roster.ts',import.meta.url),'utf8');
 const campaign=readFileSync(new URL('../src/breach-campaign-flow.ts',import.meta.url),'utf8');
 assert.match(roster,/applyDeploymentInventory\(a,member\)/);
 assert.match(campaign,/applyDeploymentInventory\(a,m\)/);
 assert.match(campaign,/limitDeployedFlashIssue\(a,issued\[i\]\)/);
 assert.doesNotMatch(roster,/a\.equipment=member\.loadout/);
 assert.doesNotMatch(campaign,/a\.equipment=m\.loadout/);
});
