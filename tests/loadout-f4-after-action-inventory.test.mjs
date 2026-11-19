import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAfterActionInventoryCloseout}
 from '../src/breach-after-action-inventory.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {newCampaign,acceptContract}
 from '../src/campaign-state.ts';

const kit=()=>{
 const base=setEquipmentChoice(initialEquipmentLoadout('carbine'),
  'utility','utility-wedge');
 return {...base,fieldInventory:{version:1,stacks:[
  {itemId:'flashbang',quantity:1,location:'rig'},
  {itemId:'flashbang',quantity:1,location:'backpack'},
  {itemId:'wedge',quantity:1,location:'belt'},
  {itemId:'zip-tie',quantity:2,location:'backpack'}]}};
};
const actor=(overrides={})=>({
 id:'rook',side:'blue',name:'ROOK',health:4,injuryStage:0,
 weapon:'carbine',magazine:23,reserve:39,
 flashCharges:1,wedgeRemaining:1,restraintRemaining:1,
 shots:7,medicalSupplies:{'tourniquet':0,'field-dressing':1,'trauma-dressing':0},
 equipment:{...kit(),fieldInventory:{version:1,stacks:[
  {itemId:'flashbang',quantity:1,location:'backpack'},
  {itemId:'wedge',quantity:1,location:'belt'},
  {itemId:'zip-tie',quantity:1,location:'backpack'}]}},
 spareMagazines:[{id:'mag-0',weapon:'carbine',rounds:25,location:'rig'}],
 ...overrides
});
const rec=(t=0)=>({manifest:{actors:[{id:'rook',side:'blue',name:'ROOK',
 equipment:kit()}]},frames:[{t,actors:[{
 id:'rook',magazine:30,reserve:45,flashCharges:2,
 wedgeRemaining:1,restraintRemaining:2,
 medicalSupplies:{'tourniquet':1,'field-dressing':2,'trauma-dressing':0}
 }]}]});
test('F4 initial and final physical evidence shows exact remaining, net use and pouch positions',()=>{
 const s={operators:[actor()],phase:'won'};
 const result=buildAfterActionInventoryCloseout({session:s,recorder:rec(),
  mode:'quick'});
 const o=result.operators[0];
 assert.equal(result.mode,'quick');assert.equal(result.source,'live-closeout');
 assert.deepEqual(o.rounds,{issued:75,remaining:62,netUsed:13});
 assert.deepEqual(o.flash,{issued:2,remaining:1,netUsed:1});
 assert.deepEqual(o.wedges,{issued:1,remaining:1,netUsed:0});
 assert.deepEqual(o.cuffs,{issued:2,remaining:1,netUsed:1});
 assert.deepEqual(o.medical,{issued:3,remaining:1,netUsed:2});
 assert.deepEqual(o.carryLocations.flash,['BACKPACK']);
 assert.deepEqual(o.carryLocations.wedges,['BELT']);
 assert.deepEqual(o.carryLocations.cuffs,['BACKPACK']);
 assert.equal(o.readiness,'fresh-round');
 assert.equal(o.hasStartEvidence,true);
 assert.equal(o.manifestMismatch,false);
 assert.equal(o.magazineIds[0],'mag-0');
 assert.equal(o.shots,7);
});
test('F4 a missing/late archived first frame is UNKNOWN rather than invented issued stock',()=>{
 const r=buildAfterActionInventoryCloseout({
 session:{operators:[actor()],phase:'lost'},recorder:rec(3),mode:'other'});
 const o=r.operators[0];
 assert.equal(o.rounds.issued,null);
 assert.equal(o.flash.issued,null);
 assert.equal(o.cuffs.netUsed,null);
 assert.equal(o.medical.issued,null);
 assert.equal(o.hasStartEvidence,false);
 assert.equal(o.readiness,'not-assessed');
});
test('F4 malformed last carry count is conspicuous, not silently displayed as available',()=>{
 const a=actor({flashCharges:2});
 const r=buildAfterActionInventoryCloseout({
 session:{operators:[a],phase:'won'},recorder:rec(),mode:'quick'});
 assert.equal(r.operators[0].manifestMismatch,true);
 assert.equal(r.operators[0].flash.remaining,2);
 assert.deepEqual(r.operators[0].carryLocations.flash,['BACKPACK']);
});
test('F4 settled Campaign readiness uses authoritative career stock and medical capacity',()=>{
 let c=newCampaign(331);
 const job=c.contracts[0];
 c=acceptContract(c,job.id);
 c={...c,activeContractId:null,operators:c.operators.map(o=>
  o.id==='rook'?{...o,magazine:10,reserve:12,
   medicalSupplies:{'tourniquet':0,'field-dressing':1,'trauma-dressing':0}}:o)};
 const a=actor();
 const r=buildAfterActionInventoryCloseout({
 session:{operators:[a],phase:'won'},recorder:rec(),mode:'mission',
 campaign:c});
 const o=r.operators[0];
 assert.equal(o.careerId,'rook');
 assert.equal(o.readiness,'replenish');
 assert.ok(o.needs.includes('AMMUNITION'));
 assert.ok(o.needs.includes('MEDICAL'));
 assert.ok(o.needs.includes('FLEX CUFFS'));
 assert.ok(!o.needs.includes('WEDGES'));
 assert.deepEqual(r.hqStock,c.supplies);
 const recovering={...c,operators:c.operators.map(o=>
  o.id==='rook'?{...o,recoveryDays:3}:o)};
 const pending=buildAfterActionInventoryCloseout({
  session:{operators:[a],phase:'won'},recorder:rec(),mode:'mission',
  campaign:recovering});
 assert.equal(pending.operators[0].readiness,'recovering');
});
test('F4 does not imply settled Campaign readiness before mission report resolves',()=>{
 const c=acceptContract(newCampaign(442),newCampaign(442).contracts[0].id);
 const o=buildAfterActionInventoryCloseout({
  session:{operators:[actor()],phase:'won'},recorder:rec(),
  mode:'mission',campaign:c}).operators[0];
 assert.equal(o.readiness,'not-assessed');
});
test('F4 view remains in the Squad panel; replay and combat ownership unchanged',()=>{
 const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
 const squad=source('src/ui/breach-after-action-squad.ts');
 const controller=source('src/ui/breach-after-action-controller.ts');
 const debrief=source('src/ui/breach-mission-debrief.ts');
 assert.match(squad,/renderAfterActionTeamReadiness\(inventory\)/);
 assert.match(squad,/renderAfterActionCarrySummary\(carried,true\)/);
 assert.match(controller,/inventory:options\.inventory\?\?null/);
 assert.match(controller,/renderSquadDetails\(operator,inspectContribution,/);
 assert.match(debrief,/buildAfterActionInventoryCloseout/);
 assert.doesNotMatch(controller,/AfterActionTab='inventory'/);
});
