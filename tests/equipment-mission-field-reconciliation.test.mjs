import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign,acceptContract,resolveOperation,readCampaign}
 from '../src/campaign-state.ts';
import {initialRoster,recordRosterMission}
 from '../src/breach-roster.ts';
import {refreshQuickPlayPreparedRoster} from '../src/breach-quickplay-kit-preferences.ts';
import {captureDeploymentInventory} from '../src/equipment-deployment-snapshot.ts';
import {spendDeployedFieldItem} from '../src/equipment-deployed-field-use.ts';
import {captureMissionFieldInventory,reconcileCampaignFieldInventory}
 from '../src/equipment-mission-field-reconciliation.ts';
import {fieldQuantity,fieldCarryReport}
 from '../src/equipment-field-inventory.ts';
import {setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {reserveRounds} from '../src/breach-magazines.ts';
import {stageMagazines} from '../src/equipment-magazine-placement.ts';

const initialCampaignWithPhysicalKit=()=>{
 let c=newCampaign(77);
 c={...c,operators:c.operators.map(o=>{
  if(o.id!=='rook')return o;
  const equipped=setEquipmentChoice(o.loadout,'utility','utility-wedge');
  const kit={...equipped,fieldInventory:{version:1,stacks:[
   {itemId:'flashbang',quantity:1,location:'rig'},
   {itemId:'wedge',quantity:2,location:'belt'}]}};
  assert.equal(fieldCarryReport(kit,o.magazines,kit.fieldInventory).valid,true);
  return {...o,loadout:kit};
 })};
 return acceptContract(c,c.contracts[0].id);
};
const report=(c,fieldRemaining,extra={})=>({
 id:'f3-test-operation',contractId:c.activeContractId,day:c.day,
 outcome:'success',grade:'B',elapsed:34,
 participatingIds:['rook'],casualties:[],objective:true,events:[],
 fieldRemaining:{rook:fieldRemaining},flashUsed:1,...extra
});
test('F3: Campaign preserves spent wedges, exact owned ammo, medical and HQ flash debit',()=>{
 const c=initialCampaignWithPhysicalKit(),op=c.operators[0],actor={};
 Object.assign(actor,captureDeploymentInventory(op));
 // The tactical actor has the same mutable property names as this snapshot,
 // with its own detached manifest; no extra or second stock owner.
 assert.equal(spendDeployedFieldItem(actor,'wedge'),true);
 assert.equal(spendDeployedFieldItem(actor,'zip-tie'),false,
  'universal restraint no longer consumes field stock');
 assert.equal(spendDeployedFieldItem(actor,'flashbang'),true);
 const remaining=captureMissionFieldInventory(actor.equipment);
 const kept=op.magazines.map((m,i)=>i===0?{...m,rounds:m.rounds-4}:({...m}));
 const reserve=reserveRounds(kept);
 const result=report(c,remaining,{
  medicalRemaining:{rook:{'tourniquet':0,'field-dressing':1,
   'trauma-dressing':0}},
  performance:[{id:'rook',shots:7,hits:2,pointShots:2,aimedShots:5,
   longHits:0,injuryStage:0,survived:true,
   magazine:op.magazine-7,reserve,spareMagazines:kept,
   loadedMagazineId:op.loadedMagazineId}]
 });
 const next=resolveOperation(c,result),saved=next.operators[0];
 assert.equal(next.supplies.flash,c.supplies.flash-1,
  'shared HQ flash is charged once, never also deducted from saved issue');
 assert.equal(fieldQuantity(saved.loadout.fieldInventory,'flashbang'),1,
  'the saved flash is a requested issue, not a second inventory debit');
 assert.equal(fieldQuantity(saved.loadout.fieldInventory,'wedge'),1);
 assert.equal(fieldQuantity(saved.loadout.fieldInventory,'zip-tie'),0);
 assert.equal(saved.loadout.fieldInventory.stacks.find(s=>s.itemId==='wedge')?.location,'belt');
 assert.equal(saved.reserve,reserve);
 assert.equal(saved.magazine,op.magazine-7);
 assert.equal(saved.magazines[0].id,kept[0].id);
 assert.equal(saved.magazines[0].rounds,kept[0].rounds);
 assert.equal(saved.loadedMagazineId,op.loadedMagazineId);
 assert.equal(saved.medicalSupplies['tourniquet'],0);
 assert.equal(saved.medicalSupplies['field-dressing'],1);
 assert.equal(fieldCarryReport(saved.loadout,saved.magazines,
  saved.loadout.fieldInventory).valid,true);
 assert.deepEqual(resolveOperation(next,result),next,'duplicate result never charges stock');
 const loaded=readCampaign(JSON.stringify(next));
 assert.ok(loaded,'new format uses existing Campaign v1 persistence');
 assert.deepEqual(loaded.operators[0].loadout.fieldInventory,
  saved.loadout.fieldInventory);
 assert.equal(fieldQuantity(c.operators[0].loadout.fieldInventory,'wedge'),2,
  'source campaign was never changed by detached mission consumption');
});
test('F3: malicious or stale mission receipts cannot mint carried field stock',()=>{
 const c=initialCampaignWithPhysicalKit(),op=c.operators[0];
 const unchanged=op.loadout.fieldInventory;
 const extra={version:1,stacks:[
  {itemId:'wedge',quantity:3,location:'belt'},
  {itemId:'zip-tie',quantity:2,location:'backpack'}]};
 assert.equal(reconcileCampaignFieldInventory(op.loadout,op.magazines,extra),null);
 const broken={version:1,stacks:[
  {itemId:'wedge',quantity:2,location:'belt'},
  {itemId:'door-charge',quantity:1,location:'backpack'}]};
 assert.equal(reconcileCampaignFieldInventory(op.loadout,op.magazines,broken),null);
 const incompatible={version:1,stacks:[
  {itemId:'wedge',quantity:1,location:'pocket'},
  {itemId:'zip-tie',quantity:2,location:'pocket'}]};
 assert.equal(reconcileCampaignFieldInventory(op.loadout,op.magazines,incompatible),null);
 const rejected=resolveOperation(c,report(c,extra,{flashUsed:0}));
 assert.deepEqual(rejected.operators[0].loadout.fieldInventory,unchanged);
 assert.equal(rejected.supplies.flash,c.supplies.flash);
 assert.equal(rejected.operators[1].loadout.fieldInventory,
  c.operators[1].loadout.fieldInventory);
});
test('F3: legacy reports preserve existing carried kit; no phantom auto resupply',()=>{
 const c=initialCampaignWithPhysicalKit(),op=c.operators[0];
 const legacy=report(c,undefined,{flashUsed:0});
 delete legacy.fieldRemaining;
 const settled=resolveOperation(c,legacy);
 assert.deepEqual(settled.operators[0].loadout.fieldInventory,
  op.loadout.fieldInventory);
 assert.equal(settled.supplies.flash,c.supplies.flash);
});
test('F3: Quick Play still resets combat consumption but retains requested carrying arrangement',()=>{
 const roster=initialRoster(),op=roster.members[0];
 const live=captureDeploymentInventory(op);
 const actor={id:'rook',side:'blue',health:4,injuryStage:0,shots:0,
  weapon:op.weapon,...live};
 assert.equal(spendDeployedFieldItem(actor,'flashbang'),true);
 assert.equal(actor.flashCharges,0);
 const completed=recordRosterMission({operators:[actor],phase:'won'},roster);
 assert.deepEqual(completed.members[0].loadout,op.loadout);
 const next=refreshQuickPlayPreparedRoster(completed).members[0];
 assert.equal(fieldQuantity(next.loadout.fieldInventory,'flashbang'),1);
 assert.equal(next.magazine,op.magazine);
 assert.equal(next.reserve,op.reserve);
 assert.deepEqual(next.magazines,stageMagazines(op.magazines,op.loadout),
  'fresh round keeps exact authored positions with newly issued standard ammo');
});
test('F3: the real results UI captures a per-career-ID field receipt, not tactic slot or editor state',()=>{
 const flow=readFileSync(new URL('../src/breach-campaign-flow.ts',import.meta.url),'utf8');
 const state=readFileSync(new URL('../src/campaign-state.ts',import.meta.url),'utf8');
 assert.match(flow,/fieldRemaining:Object.fromEntries\(members\.flatMap/);
 assert.match(flow,/careerId\(a\.id\),remaining/);
 assert.match(state,/reconcileCampaignFieldInventory\(current\.loadout,current\.magazines/);
});
