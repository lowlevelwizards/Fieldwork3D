import test from 'node:test';import assert from 'node:assert/strict';
import {initialRoster,moveRosterMagazine,undoRosterCarryGear} from '../src/breach-roster.ts';
import {newCampaign,moveCampaignMagazine,undoCampaignCarryGear,acceptContract}
 from '../src/campaign-state.ts';
import {captureCarryUndo} from '../src/equipment-carry-undo.ts';
test('roster undo restores recorded physical magazine state exactly',()=>{
 const first=initialRoster(),operator=first.members[0];
 const moved=moveRosterMagazine(first,operator.id,operator.magazines[0].id,'backpack');
 assert.notEqual(moved,first);
 const before=captureCarryUndo(operator.loadout,operator.magazines);
 const actual=moved.members[0];
 const after=captureCarryUndo(actual.loadout,actual.magazines);
 const restored=undoRosterCarryGear(moved,operator.id,after,before);
 assert.notEqual(restored,moved);
 assert.deepEqual(restored.members[0].magazines,operator.magazines);
 assert.equal(undoRosterCarryGear(moved,operator.id,before,before),moved,
  'stale expected snapshot is rejected');
});
test('Campaign undo respects contract state and does not mint magazine rounds',()=>{
 const start=newCampaign(112),op=start.operators[0],id=op.magazines[0].id;
 const moved=moveCampaignMagazine(start,op.id,id,'backpack');
 assert.notEqual(moved,start);
 const before=captureCarryUndo(op.loadout,op.magazines);
 const changed=moved.operators[0];
 const expected=captureCarryUndo(changed.loadout,changed.magazines);
 const restored=undoCampaignCarryGear(moved,op.id,expected,before);
 assert.deepEqual(restored.operators[0].magazines,op.magazines);
 const accepted=acceptContract(moved,moved.contracts[0].id);
 assert.equal(undoCampaignCarryGear(accepted,op.id,expected,before),accepted);
 const altered=captureCarryUndo({...changed.loadout,
  slots:{...changed.loadout.slots,rig:'rig-none'}},changed.magazines);
 assert.equal(undoCampaignCarryGear(moved,op.id,altered,before),moved);
});
