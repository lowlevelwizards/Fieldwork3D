import test from 'node:test';
import assert from 'node:assert/strict';
import {initialRoster,moveRosterMagazine} from '../src/breach-roster.ts';
import {newCampaign,moveCampaignMagazine,acceptContract} from '../src/campaign-state.ts';
import {stageMagazines} from '../src/equipment-magazine-placement.ts';
import {quoteOneMagazineMove} from '../src/equipment-magazine-transfer.ts';
test('Quick Play commits the exact quoted magazines while preserving rounds',()=>{
 const roster=initialRoster(),op=roster.members[0],id=op.magazines[0].id;
 const quoted=quoteOneMagazineMove(op.loadout,op.magazines,id,'backpack');
 assert.equal(quoted.ok,true,quoted.ok?'':quoted.reason);
 const moved=moveRosterMagazine(roster,op.id,id,'backpack');
 assert.notEqual(moved,roster);
 assert.deepEqual(moved.members[0].magazines,quoted.magazines);
 assert.deepEqual(roster.members[0].magazines,op.magazines);
});
test('Campaign applies the same physical quote and locks accepted contracts',()=>{
 const campaign=newCampaign(131),op=campaign.operators[0],id=op.magazines[0].id;
 const quoted=quoteOneMagazineMove(op.loadout,op.magazines,id,'backpack');
 assert.equal(quoted.ok,true,quoted.ok?'':quoted.reason);
 const moved=moveCampaignMagazine(campaign,op.id,id,'backpack');
 assert.deepEqual(moved.operators[0].magazines,quoted.magazines);
 const locked=acceptContract(campaign,campaign.contracts[0].id);
 assert.equal(moveCampaignMagazine(locked,op.id,id,'backpack'),locked);
});
test('owner never displaces unrelated magazines for an explicit placement',()=>{
 const roster=initialRoster(),op=roster.members[0];
 const before=stageMagazines(op.magazines,op.loadout);
 const moved=moveRosterMagazine(roster,op.id,op.magazines[0].id,'pocket');
 if(moved!==roster){
  const next=stageMagazines(moved.members[0].magazines,op.loadout);
  for(const m of before)if(m.id!==op.magazines[0].id)
   assert.equal(next.find(n=>n.id===m.id)?.location,m.location);
 }
 assert.deepEqual(roster.members[0].magazines,op.magazines);
});
