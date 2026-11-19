import test from 'node:test';import assert from 'node:assert/strict';
import {initialRoster,moveRosterMagazine,copyRosterCarryLayout} from '../src/breach-roster.ts';
import {newCampaign,moveCampaignMagazine,copyCampaignCarryLayout,acceptContract}
 from '../src/campaign-state.ts';
import {fieldQuantity} from '../src/equipment-field-inventory.ts';
test('same-magazine-class roster copy moves positions without changing magazine ownership',()=>{
 const start=initialRoster(),source=start.members[0],target=start.members[0];
 const from=moveRosterMagazine(start,source.id,source.magazines[0].id,'backpack');
 // Explicitly incompatible magazine families must be rejected. The real
 // starting squad can have several carbines, so never assume a class split.
 const second=from.members[1];
 const incompatible={...from,members:from.members.map(m=>m.id!==second.id?m:
  {...m,magazines:m.magazines.map(mag=>({...mag,weapon:'smg'}))})};
 const rejected=copyRosterCarryLayout(incompatible,source.id,second.id);
 assert.equal(rejected,incompatible);
 // Explicit same-weapon-class partner with independent physical stock.
 const copy={...from,members:[from.members[0],{...from.members[0],
  id:'duplicate',callsign:'TWIN',magazines:from.members[0].magazines.map(m=>({
   ...m,id:'twin-'+m.id,rounds:7,location:'rig'
  }))}]};
 const changed=copyRosterCarryLayout(copy,source.id,'duplicate');
 assert.notEqual(changed,copy);
 const recipient=changed.members[1];
 assert.deepEqual(recipient.magazines.map(m=>m.rounds),copy.members[1].magazines.map(m=>m.rounds));
 assert.deepEqual(recipient.magazines.map(m=>m.id),copy.members[1].magazines.map(m=>m.id));
 assert.equal(recipient.magazines[0].location,'backpack');
 assert.equal(fieldQuantity(recipient.loadout.fieldInventory,'flashbang'),1);
});
test('Campaign layout copies are rejected during accepted contracts',()=>{
 const c=newCampaign(99);
 const locked=acceptContract(c,c.contracts[0].id);
 assert.equal(copyCampaignCarryLayout(locked,c.operators[0].id,c.operators[1].id),locked);
 assert.equal(copyCampaignCarryLayout(c,c.operators[0].id,c.operators[0].id),c);
});
