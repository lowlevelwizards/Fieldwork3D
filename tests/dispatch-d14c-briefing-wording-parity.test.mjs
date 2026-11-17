import test from 'node:test';
import assert from 'node:assert/strict';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {dispatchCaseDossier} from '../src/dispatch-case-dossier.ts';
import {campaignIncidentView} from '../src/dispatch-incident-view.ts';
import {dispatchIncidentDefinition} from '../src/dispatch-case-contract.ts';
import {selectAuthoredIncidentWording} from '../src/briefing/incident-wording.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {operationBrief} from '../src/breach-operations.ts';

const fixtures=[
 {incidentId:'warrant-service',kind:'capture',archetype:'house',premise:'guarded'},
 {incidentId:'evidence-seizure',kind:'intel',archetype:'office',premise:'guarded'},
 {incidentId:'perimeter-recovery',kind:'hold',archetype:'house',premise:'guarded'}
];
test('D14.5 predeployment and tactical briefing select identical authored report wording',()=>{
 const base=newDispatchPilotCampaign(1455);
 for(const [i,fixture] of fixtures.entries()){
  const contract={...base.contracts[0],id:'d14c-'+i,seed:14550+i*17,
   kind:fixture.kind,dispatchCase:{version:1,incidentId:fixture.incidentId,
    archetype:fixture.archetype}};
  const c={...base,contracts:[contract]};
  const context=dispatchCaseDossier(c,contract);
  assert.ok(context);
  const view=campaignIncidentView(c,contract);
  const truth={
   schema:1,seed:contract.seed,missionKind:contract.kind,building:fixture.archetype,
   subtype:null,siteName:'Test Site',scale:'standard',propertyCondition:null,
   premise:fixture.premise,encounterProfile:'prepared',risk:contract.risk,
   riskFromContract:true,intelMode:'true-blind',roomCount:4,hostileCount:1,
   armedProfileCount:{ordinary:1,security:0,prepared:0},activeCivilianCount:0,
   rescueTargetPresent:contract.kind==='rescue',
   captureTargetPresent:contract.kind==='capture',
   objective:operationBrief(contract.kind),entryId:'FRONT',
   encounterIncidentId:fixture.incidentId
  };
  const tactical=createOperationDossier(truth);
  assert.equal(tactical.identity.incidentId,fixture.incidentId);
  assert.equal(context.lead,tactical.incident.lead);
  assert.equal(context.context,tactical.incident.context);
  assert.equal(view.description,context.context);
  assert.deepEqual(dispatchCaseDossier(c,contract),context,'repeated renders remain stable');
 }
});

test('D14.5 seed and authored incident identity vary wording without mutating catalog',()=>{
 const first=dispatchIncidentDefinition('warrant-service');
 assert.ok(first);
 const before=structuredClone(first);
 const picked=Array.from({length:75},(_,i)=>
  selectAuthoredIncidentWording(first,0x1400+i));
 assert.equal(new Set(picked.map(x=>x.lead)).size,first.leads.length);
 assert.equal(new Set(picked.map(x=>x.context)).size,first.contexts.length);
 for(const i of [0,5,22]){
  const again=selectAuthoredIncidentWording(first,0x1400+i);
  assert.equal(picked[i].narrativeSeed,again.narrativeSeed);
  assert.equal(picked[i].lead,again.lead);
  assert.equal(picked[i].context,again.context);
 }
 assert.deepEqual(first,before,'authored prose and mission metadata remain unchanged');
});
