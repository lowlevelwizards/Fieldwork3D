import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,equipRosterCarryGear} from '../src/breach-roster.ts';
import {newCampaign,equipCampaignCarryGear,acceptContract} from '../src/campaign-state.ts';
import {quoteCarryGearChange} from '../src/equipment-carry-gear-change.ts';
test('Quick Play carry gear commit conserves every magazine and consumable',()=>{
 const roster=initialRoster(),op=roster.members[0];
 const quote=quoteCarryGearChange(op.loadout,op.magazines,'rig','rig-none');
 const result=equipRosterCarryGear(roster,op.id,'rig','rig-none');
 if(!quote.ok){assert.equal(result,roster);return;}
 assert.notEqual(result,roster);
 assert.deepEqual(result.members[0].magazines,quote.magazines);
 assert.deepEqual(result.members[0].loadout,quote.kit);
 assert.equal(roster.members[0].loadout.slots.rig,op.loadout.slots.rig);
});
test('Campaign rejects impossible gear swaps and respects accepted-contract lock',()=>{
 let c=newCampaign(44);const op=c.operators[0];
 const quoted=quoteCarryGearChange(op.loadout,op.magazines,'rig','rig-none');
 const proposed=equipCampaignCarryGear(c,op.id,'rig','rig-none');
 if(quoted.ok){
  assert.deepEqual(proposed.operators[0].loadout,quoted.kit);
  assert.deepEqual(proposed.operators[0].magazines,quoted.magazines);
 }else assert.equal(proposed,c);
 const locked=acceptContract(c,c.contracts[0].id);
 assert.equal(equipCampaignCarryGear(locked,op.id,'rig','rig-none'),locked);
 assert.equal(equipCampaignCarryGear(c,op.id,'rig','wrong-kit'),c);
});
test('a fully removed carrying system cannot silently orphan field equipment',()=>{
 let r=initialRoster(),op=r.members[0];
 r=equipRosterCarryGear(r,op.id,'backpack','backpack-none');
 const after=r.members[0];
 const before=after.loadout;
 const result=equipRosterCarryGear(r,op.id,'rig','rig-none');
 const quote=quoteCarryGearChange(before,after.magazines,'rig','rig-none');
 assert.equal(result===r,!quote.ok);
 if(quote.ok)assert.deepEqual(result.members[0].loadout,quote.kit);
});
