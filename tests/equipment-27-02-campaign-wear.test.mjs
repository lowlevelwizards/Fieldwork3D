import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,acceptContract,resolveOperation,readCampaign}
 from '../src/campaign-state.ts';
const performance=(shots)=>({id:'rook',shots,hits:0,pointShots:0,
 aimedShots:0,longHits:0,injuryStage:0,survived:true,magazine:0,reserve:0});
const report=(id,contractId,shots)=>({id,contractId,day:1,
 outcome:'success',grade:'A',elapsed:20,participatingIds:['rook'],
 casualties:[],objective:true,events:[],performance:[performance(shots)]});
test('27.02 only actual debrief rounds wear the exact issued serial once',()=>{
 const c=newCampaign(39),contract=c.contracts.find(k=>k.status==='available');
 const ready=acceptContract(c,contract.id);
 const serial=c.operators[0].weaponSerialId;
 const done=resolveOperation(ready,report('trial-01',contract.id,76));
 const weapon=done.inventory.serializedWeapons.find(w=>w.id===serial);
 assert.equal(weapon.roundsFired,76);assert.equal(weapon.condition,99);
 assert.equal(weapon.history.at(-1).operationId,'trial-01');
 assert.ok(done.inventory.serializedWeapons.filter(w=>w.id!==serial)
  .every(w=>w.roundsFired===0));
 assert.equal(resolveOperation(done,report('trial-01',contract.id,76)),done);
});
test('27.02 zero-shot missions never wear firearms and records roundtrip',()=>{
 const c=newCampaign(40),contract=c.contracts.find(k=>k.status==='available');
 const ready=acceptContract(c,contract.id);
 const done=resolveOperation(ready,report('trial-empty',contract.id,0));
 const first=done.inventory.serializedWeapons.find(w=>
  w.id===done.operators[0].weaponSerialId);
 assert.equal(first.roundsFired,0);
 const restored=readCampaign(JSON.stringify(done));
 assert.deepEqual(restored.inventory.serializedWeapons,done.inventory.serializedWeapons);
});
