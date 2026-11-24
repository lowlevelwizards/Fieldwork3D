import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
import {deployedDispatchIncident,historicalDispatchIncident,
 validatedDispatchIncident} from '../src/dispatch-incident-context.ts';
import {attachCampaignDossierContext} from '../src/briefing/campaign-context.ts';
import {createOperationDossier} from '../src/briefing/briefing-composer.ts';
import {operationBrief} from '../src/breach-operations.ts';

const source=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
const facts={schema:1,seed:76,missionKind:'hold',building:'warehouse',
 subtype:'distribution',siteName:'FACILITY',scale:'standard',
 propertyCondition:'occupied',premise:'guarded',encounterProfile:'prepared',
 risk:3,riskFromContract:true,intelMode:'floor-plan',roomCount:8,
 hostileCount:4,armedProfileCount:{ordinary:4,security:0,prepared:0},
 activeCivilianCount:0,rescueTargetPresent:false,captureTargetPresent:false,
 objective:operationBrief('hold'),entryId:'FRONT'};

test('D5.1 Dispatch dossier reuses canonical accepted incident, not a new mission',()=>{
 const base=newDispatchPilotCampaign(30);
 const job=base.contracts.find(x=>x.kind==='hold')??base.contracts[0];
 const c=acceptContract(base,job.id);
 const incident=deployedDispatchIncident(c,job.id);
 const dossier=createOperationDossier(facts);
 const contextual=attachCampaignDossierContext(dossier,c);
 assert.equal(contextual.campaign.contractId,job.id);
 assert.equal(contextual.campaign.title,incident.title);
 assert.equal(contextual.campaign.reference,incident.reference);
 assert.equal(contextual.campaign.risk,job.risk);
 assert.deepEqual(contextual.rendered,dossier.rendered);
 assert.deepEqual(attachCampaignDossierContext(dossier,null),dossier);
 const legacy=acceptContract(newCampaign(31),newCampaign(31).contracts[0].id);
 const old=attachCampaignDossierContext(dossier,legacy);
 assert.equal(old.campaign.title,legacy.contracts[0].title);
});

test('D5.3 settlement and older record source are consistent and idempotent',()=>{
 const base=newDispatchPilotCampaign(511);
 const accepted=acceptContract(base,base.contracts[0].id);
 const incident=deployedDispatchIncident(accepted,accepted.activeContractId);
 const report={id:'mission-d5-a',contractId:incident.contractId,day:accepted.day,
  outcome:'failure',grade:'D',elapsed:27,
  participatingIds:[],casualties:[],objective:false,events:[]};
 const settled=resolveOperation(accepted,report);
 assert.strictEqual(validatedDispatchIncident(settled,incident),incident);
 assert.equal(historicalDispatchIncident(settled,report).reference,incident.reference);
 assert.deepEqual(resolveOperation(settled,report),settled);
 assert.equal(historicalDispatchIncident({...settled,contracts:[]},report),null);
});

test('D5.4 wiring covers fallback briefing, live mission and debrief cache identity',()=>{
 const screens=source('ui/breach-mission-screens.ts');
 const flow=source('breach-campaign-flow.ts');
 const main=source('breach-main.ts');
 const deb=source('ui/breach-mission-debrief.ts');
 const details=source('ui/breach-after-action-mission-details.ts');
 const chronicle=source('ui/campaign/chronicle-view.ts');
 assert.match(screens,/incident\?\.title\?\?model.title/);
 assert.match(screens,/ui.briefingCampaignContext.textContent=incident\?/);
 assert.match(screens,/dispatchSettingsReference\.hidden=!incident/);
 assert.match(flow,/deployedIncident=deployedDispatchIncident\(model.campaign,job.id\)/);
 assert.match(flow,/validatedDispatchIncident\(config.getCampaign\(\),deployedIncident\)/);
 assert.match(main,/readDispatchIncident=campaignFlow.getIncident/);
 assert.match(main,/incident:!replaying\?readDispatchIncident\(\):null/);
 assert.match(deb,/previous.incidentKey===incidentKey/);
 assert.match(deb,/incident\?\.title\?\?brief.name/);
 assert.match(details,/DISPATCH INCIDENT/);
 assert.match(chronicle,/historicalDispatchIncident\(c,report\)/);
});
