import test from 'node:test';
import assert from 'node:assert/strict';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign,readCampaign} from '../src/campaign-state.ts';
import {DISPATCH_D8_INCIDENT_IDS,dispatchIncidentDefinition}
 from '../src/dispatch-case-contract.ts';
import {dispatchCaseDossier} from '../src/dispatch-case-dossier.ts';

test('D14.6 situation profile covers every authored incident without changing the contract',()=>{
 const base=newDispatchPilotCampaign(14621);
 for(const id of DISPATCH_D8_INCIDENT_IDS){
  const def=dispatchIncidentDefinition(id);
  assert.ok(def?.buildings?.length,id);
  for(const risk of [1,3]){
   const job={...base.contracts[0],id:'d14d-'+id,kind:def.missions[0],
    risk,scale:risk===3?'expanded':'standard',deadline:14,
    region:'Cutwoods',dispatchCase:{version:1,incidentId:id,archetype:def.buildings[0]}};
   const campaign={...base,contracts:[job]};
   const before=structuredClone(campaign);
   const dossier=dispatchCaseDossier(campaign,job);
   assert.ok(dossier,id);
   assert.match(dossier.situation.emphasis,/^(SITE|ITEM|PERSON|POSITION|TARGET) /);
   assert.match(dossier.situation.riskAssessment,risk===3?/HIGH CONTRACT RISK/:/LOW CONTRACT RISK/);
   assert.match(dossier.situation.riskAssessment,/not a verified threat count/);
   assert.equal(dossier.situation.siteScale,
    risk===3?'EXPANDED MISSION FOOTPRINT':'STANDARD MISSION FOOTPRINT');
   assert.equal(dossier.situation.due,'REGION Cutwoods · DEADLINE DAY 14');
   assert.equal(Object.isFrozen(dossier.situation),true);
   assert.deepEqual(campaign,before,'projection is read-only');
  }
 }
});
test('D14.6 legacy, malformed and non-Dispatch contracts do not generate asserted case evidence',()=>{
 const dispatch=newDispatchPilotCampaign(14622);
 const original=dispatch.contracts[0];
 const legacy={...original,dispatchCase:undefined};
 const malformed={...original,dispatchCase:{version:1,incidentId:'forged',archetype:'house'}};
 const campaign={...dispatch,contracts:[legacy]};
 assert.ok(dispatchCaseDossier(campaign,legacy)?.situation);
 assert.match(dispatchCaseDossier(campaign,legacy).lead,/No detailed reported lead/);
 assert.match(dispatchCaseDossier({...dispatch,contracts:[malformed]},malformed).lead,
  /No detailed reported lead/);
 const saved=readCampaign(JSON.stringify(dispatch));
 assert.ok(saved);
 assert.deepEqual(dispatchCaseDossier(saved,saved.contracts[0]),
  dispatchCaseDossier(dispatch,dispatch.contracts[0]));
 assert.equal(dispatchCaseDossier(newCampaign(14622),newCampaign(14622).contracts[0]),null);
});
