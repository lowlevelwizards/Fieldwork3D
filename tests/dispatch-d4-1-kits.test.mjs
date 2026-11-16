import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,saveCampaignKitPreset,canApplyCampaignKitPreset,
 applyCampaignKitPreset,equipCampaignGear,readCampaign} from '../src/campaign-state.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';

test('D4.1 normal SWAT can edit real curated kit choices and restore saved kits',()=>{
 const pilot=newDispatchPilotCampaign(35),id=pilot.operators[0].id;
 const saved=saveCampaignKitPreset(pilot,id,'Original SWAT');
 const preset=saved.kitPresets[0];
 assert.ok(preset);
 assert.equal(canApplyCampaignKitPreset(saved,id,preset.id),true);
 const altered=equipCampaignGear(saved,id,'utility','utility-light');
 assert.notEqual(altered,saved);
 assert.equal(altered.operators[0].loadout.slots.utility,'utility-light');
 const before=altered.operators[0].weaponSerialId;
 const restored=applyCampaignKitPreset(altered,id,preset.id);
 assert.notEqual(restored,altered);
 assert.equal(restored.operators[0].loadout.slots.utility,'utility-radio');
 assert.equal(restored.operators[0].weaponSerialId,before);
 assert.deepEqual(readCampaign(JSON.stringify(restored)),restored);
});

test('D4.1 refuses entire unclassified kit preset without silently changing a slot',()=>{
 const pilot=newDispatchPilotCampaign(61),id=pilot.operators[0].id;
 const valid=saveCampaignKitPreset(pilot,id,'SWAT');
 const p=valid.kitPresets[0];
 const corrupt={...p,kit:{...p.kit,slots:{...p.kit.slots,
  backpack:'backpack-field'}}};
 const c={...valid,kitPresets:[corrupt]};
 assert.equal(canApplyCampaignKitPreset(c,id,p.id),false);
 assert.strictEqual(applyCampaignKitPreset(c,id,p.id),c);
 const foreign={...p,weapon:'rifle'};
 const c2={...valid,kitPresets:[foreign]};
 assert.equal(canApplyCampaignKitPreset(c2,id,p.id),false);
 assert.strictEqual(applyCampaignKitPreset(c2,id,p.id),c2);
 const badBuild={...p,weaponConfiguration:{...p.weaponConfiguration,
  slots:{...p.weaponConfiguration.slots,optic:'optic-reflex'}}};
 const c3={...valid,kitPresets:[badBuild]};
 assert.equal(canApplyCampaignKitPreset(c3,id,p.id),false);
 assert.strictEqual(applyCampaignKitPreset(c3,id,p.id),c3);
});

test('D4.1 legacy campaigns preserve prior saved-kit semantics',()=>{
 const c=newCampaign(90),id=c.operators[0].id;
 const withPreset=saveCampaignKitPreset(c,id,'Any legacy gear');
 assert.equal(canApplyCampaignKitPreset(withPreset,id,withPreset.kitPresets[0].id),true);
 assert.notEqual(applyCampaignKitPreset(withPreset,id,withPreset.kitPresets[0].id),
  withPreset);
});
