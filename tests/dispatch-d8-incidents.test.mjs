import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newCampaign,readCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {assignDispatchCase} from '../src/dispatch-case-selection.ts';
import {DISPATCH_D8_INCIDENT_IDS,dispatchIncidentDefinition,validDispatchCase}
 from '../src/dispatch-case-contract.ts';
import {campaignIncidentView} from '../src/dispatch-incident-view.ts';
import {deployedDispatchIncident,historicalDispatchIncident} from '../src/dispatch-incident-context.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession} from '../src/breach-game.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {attachCampaignDossierContext} from '../src/briefing/campaign-context.ts';
import {activateSite} from '../src/breach-core.ts';

test('D8.1: only versioned compatible Dispatch cases can load, old saves remain valid',()=>{
 const dispatch=newDispatchPilotCampaign(821);
 const job=dispatch.contracts[0];
 assert.ok(validDispatchCase(job.dispatchCase,job.kind));
 assert.deepEqual(readCampaign(JSON.stringify(dispatch)),dispatch);
 for(const bad of [
  {...job.dispatchCase,version:2},
  {...job.dispatchCase,incidentId:'fictitious'},
  {...job.dispatchCase,archetype:'moon'},
  {...job.dispatchCase,additional:true},
  {...job.dispatchCase,incidentId:'generic-'+job.kind}
 ]){
  const forged={...dispatch,contracts:dispatch.contracts.map(k=>
   k.id===job.id?{...k,dispatchCase:bad}:k)};
  assert.equal(readCampaign(JSON.stringify(forged)),null);
 }
 const old={...dispatch,contracts:dispatch.contracts.map(({dispatchCase,...contract})=>contract)};
 assert.deepEqual(readCampaign(JSON.stringify(old)),old);
 const sandbox=newCampaign(821);
 assert.equal(sandbox.contracts.some(k=>k.dispatchCase),false);
 assert.deepEqual(readCampaign(JSON.stringify(sandbox)),sandbox);
 const injected={...sandbox,contracts:sandbox.contracts.map((k,i)=>
   i===0?{...k,dispatchCase:job.dispatchCase}:k)};
 assert.equal(readCampaign(JSON.stringify(injected)),null);
});

test('D8.2: authored Dispatch cases are deterministic, compatible, and only assigned once',()=>{
 assert.equal(DISPATCH_D8_INCIDENT_IDS.length,19);
 const a=newDispatchPilotCampaign(813),b=newDispatchPilotCampaign(813);
 assert.deepEqual(a.contracts,b.contracts);
 for(const job of a.contracts){
  assert.equal(validDispatchCase(job.dispatchCase,job.kind),true);
  const definition=dispatchIncidentDefinition(job.dispatchCase.incidentId);
  assert.ok(definition.missions.includes(job.kind));
  assert.ok(definition.buildings.includes(job.dispatchCase.archetype));
  assert.equal(assignDispatchCase(job),job,'already authored contract is immutable');
  assert.equal(campaignIncidentView(a,job).title,definition.name);
  assert.equal(campaignIncidentView(a,job).originalTitle,job.title);
 }
 const legacy=newCampaign(813);
 assert.ok(legacy.contracts.every(k=>!k.dispatchCase));
});

test('D8.2/D8.6: accepted cases and follow-up identities survive outcome and reload',()=>{
 const initial=newDispatchPilotCampaign(932);
 const job=initial.contracts[0];
 const accepted=acceptContract(initial,job.id);
 const original=deployedDispatchIncident(accepted,job.id);
 assert.equal(original.title,campaignIncidentView(initial,job).title);
 const result={id:'d8-op-1',contractId:job.id,day:accepted.day,
  outcome:'success',grade:'A',elapsed:90,participatingIds:[],
  casualties:[],objective:true,events:[]};
 const settled=resolveOperation(accepted,result);
 assert.deepEqual(settled.contracts.find(c=>c.id===job.id).dispatchCase,job.dispatchCase);
 assert.equal(historicalDispatchIncident(settled,result).title,original.title);
 const followups=settled.contracts.filter(c=>c.followUpOf===job.id);
 for(const followup of followups)
  assert.ok(validDispatchCase(followup.dispatchCase,followup.kind));
 assert.equal(settled.contracts.filter(c=>c.status==='available')
  .every(c=>validDispatchCase(c.dispatchCase,c.kind)),true);
 assert.deepEqual(readCampaign(JSON.stringify(settled)),settled);
 assert.deepEqual(resolveOperation(settled,result),settled);
});

test('D8.3/D8.4: selected case drives a physically matching site and truthful dossier',()=>{
 const cases=[
  {id:'warrant-service',kind:'capture',archetype:'house',seed:22},
  {id:'missing-person',kind:'rescue',archetype:'house',seed:12},
  {id:'evidence-seizure',kind:'intel',archetype:'office',seed:13}
 ];
 try{
  for(const c of cases){
   const site=generateSite(c.seed,'small',undefined,{
    mission:c.kind,risk:3,enableIncidentIntent:true,
    incidentId:c.id,strictIncident:true,archetype:c.archetype
   },{archetype:c.archetype});
   assert.equal(site.archetype,c.archetype);
   assert.equal(site.encounter?.incidentIntentId,c.id);
   const session=newSession(0,c.seed,'true-blind','small',c.kind,site);
   const facts=compileMissionFacts(session);
   const dossier=createOperationDossier(facts);
   assert.equal(facts.encounterIncidentId,c.id);
   assert.equal(dossier.identity.incidentId,c.id);
   assert.equal(dossier.identity.missionKind,c.kind);
   assert.ok(dossier.claims.every(x=>x.disclosure!=='floor-plan'));
  }
 }finally{activateSite(null);}
});

test('D8.3: impossible strict incident is rejected rather than silently swapped',()=>{
 assert.throws(()=>generateSite(22,'small',undefined,{
  mission:'capture',enableIncidentIntent:true,incidentId:'warrant-service',
  strictIncident:true,archetype:'warehouse'
 },{archetype:'warehouse'}),/Dispatch incident incompatible/);
});

test('D8.3–D8.5: source bridge honors case identity and preserves restart prebuilt site',async()=>{
 const text=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
 assert.match(text('breach-main.ts'),/job\.dispatchCase\)/);
 assert.match(text('breach-mission-controller.ts'),/strictIncident:!!request\.incidentId/);
 assert.match(text('breach-session-factory.ts'),/archetype:encounterContext\.archetype/);
 assert.match(text('breach-mission-controller.ts'),/prebuiltSite:siteForMissionRestart\(start\)/);
 assert.match(text('campaign-ui.ts'),/PROPERTY TYPE/);
 const base=newDispatchPilotCampaign(818);
 const accepted=acceptContract(base,base.contracts[0].id);
 const job=base.contracts[0];
 const dossier=createOperationDossier({
  schema:1,seed:job.seed,missionKind:job.kind,building:job.dispatchCase.archetype,
  subtype:null,siteName:'Test',scale:'standard',propertyCondition:null,
  premise:'guarded',encounterProfile:'prepared',risk:job.risk,riskFromContract:true,
  intelMode:'true-blind',roomCount:4,hostileCount:1,
  armedProfileCount:{ordinary:1,security:0,prepared:0},activeCivilianCount:0,
  captureTargetPresent:job.kind==='capture',rescueTargetPresent:job.kind==='rescue',
  objective:(await import('../src/breach-operations.ts')).operationBrief(job.kind),
  entryId:'FRONT'
 });
 assert.equal(attachCampaignDossierContext(dossier,accepted).campaign.title,
  campaignIncidentView(accepted,job).title);
});
