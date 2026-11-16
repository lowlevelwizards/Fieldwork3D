import test from 'node:test';
import assert from 'node:assert/strict';
import {hireRecruit,equipCampaignGear,saveCampaignKitPreset,
 canApplyCampaignKitPreset,applyCampaignKitPreset,acceptContract,
 resolveOperation,readCampaign} from '../src/campaign-state.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {campaignIncidentView} from '../src/dispatch-incident-view.ts';
import {commitCampaignToSlot,loadCampaignSlot,activeCampaignSlot}
 from '../src/campaign-save-slots.ts';
import {weaponOwnershipIssues} from '../src/equipment-weapon-ownership.ts';

const memory=()=>{
 const values=new Map();
 return {getItem:key=>values.get(key)??null,
  setItem:(key,value)=>values.set(key,value),
  removeItem:key=>values.delete(key)};
};

test('D4.3 SWAT pilot lifecycle: recruit, equip, deploy, debrief, resume',()=>{
 const storage=memory(),start=newDispatchPilotCampaign(503);
 const recruited=hireRecruit(start),id=recruited.operators[4].id;
 assert.equal(recruited.operators[4].status,'reserve');
 const assigned=equipCampaignGear(recruited,id,'utility','utility-light');
 assert.equal(assigned.operators[4].loadout.slots.utility,'utility-light');
 const withPreset=saveCampaignKitPreset(assigned,id,'Dispatch duty kit');
 const preset=withPreset.kitPresets.at(-1);
 assert.equal(canApplyCampaignKitPreset(withPreset,id,preset.id),true);
 const changed=equipCampaignGear(withPreset,id,'utility','utility-radio');
 const restored=applyCampaignKitPreset(changed,id,preset.id);
 assert.equal(restored.operators[4].loadout.slots.utility,'utility-light');
 assert.equal(commitCampaignToSlot(restored,'dispatch',storage),true);
 assert.equal(activeCampaignSlot(storage),'dispatch');
 const loaded=loadCampaignSlot('dispatch',storage);
 assert.deepEqual(loaded,readCampaign(JSON.stringify(restored)));
 assert.deepEqual(weaponOwnershipIssues(loaded),[]);
 const contract=loaded.contracts[0];
 const accepted=acceptContract(loaded,contract.id);
 assert.equal(accepted.activeContractId,contract.id);
 const report={id:'dispatch-d4-accept-1',contractId:contract.id,day:accepted.day,
  outcome:'success',grade:'B',elapsed:50,
  participatingIds:[id],casualties:[],objective:true,events:[]};
 const settled=resolveOperation(accepted,report);
 assert.notEqual(settled,accepted);
 assert.equal(settled.history.some(x=>x.id===report.id),true);
 assert.deepEqual(resolveOperation(settled,report),settled);
 assert.equal(commitCampaignToSlot(settled,'dispatch',storage),true);
 assert.deepEqual(loadCampaignSlot('dispatch',storage),settled);
 assert.deepEqual(weaponOwnershipIssues(settled),[]);
 assert.equal(loadCampaignSlot('legacy',storage),null);
 assert.equal(loadCampaignSlot('sandbox',storage),null);
});

test('D4.2 incident view is truthful, deterministic and presentation-only',()=>{
 const c=newDispatchPilotCampaign(98),before=JSON.stringify(c);
 const known=new Set(['clear','intel','rescue','hold','capture']);
 for(const job of c.contracts){
  const view=campaignIncidentView(c,job);
  assert.equal(view.category,'DISPATCH / PILOT INCIDENT');
  assert.match(view.reference,/^DISPATCH · CT-/);
  assert.ok(view.title);
  assert.ok(view.description);
  assert.equal(view.originalTitle,job.title);
  assert.ok(known.has(job.kind));
  assert.deepEqual(campaignIncidentView(c,job),view);
 }
 assert.equal(JSON.stringify(c),before);
 assert.equal(campaignIncidentView({...c,rules:undefined},c.contracts[0]).title,
  c.contracts[0].title);
});
