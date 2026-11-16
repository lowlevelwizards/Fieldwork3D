import test from 'node:test';
import assert from 'node:assert/strict';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
import {deployedDispatchIncident,validatedDispatchIncident,
 historicalDispatchIncident} from '../src/dispatch-incident-context.ts';

test('D5.0 incident identity survives settlement but rejects another career',()=>{
 const base=newDispatchPilotCampaign(503),job=base.contracts[0];
 const accepted=acceptContract(base,job.id);
 const snap=deployedDispatchIncident(accepted,job.id);
 assert.ok(snap);
 assert.equal(snap.campaignId,base.id);
 assert.equal(snap.contractId,job.id);
 assert.equal(snap.reference,'DISPATCH · '+job.id.toUpperCase());
 assert.equal(snap.kind,job.kind);
 assert.equal(Object.isFrozen(snap),true);
 assert.equal(validatedDispatchIncident(accepted,snap),snap);
 const report={id:'d5-report-1',contractId:job.id,day:accepted.day,
  outcome:'success',grade:'B',elapsed:48,
  participatingIds:[],casualties:[],objective:true,events:[]};
 const settled=resolveOperation(accepted,report);
 assert.equal(settled.activeContractId,null);
 assert.equal(validatedDispatchIncident(settled,snap),snap);
 const historic=historicalDispatchIncident(settled,report);
 assert.equal(historic.title,snap.title);
 assert.equal(historic.contractId,snap.contractId);
 assert.equal(historic.day,report.day);
 assert.equal(validatedDispatchIncident({...settled,id:'another-career'},snap),null);
 assert.equal(validatedDispatchIncident(newCampaign(2),snap),null);
 assert.equal(deployedDispatchIncident(base,job.id),null);
});

test('D5.0 historical fallback never invents a missing/pruned contract',()=>{
 const c=newDispatchPilotCampaign(95),before=JSON.stringify(c);
 const missing={contractId:'CT-REMOVED',day:8};
 assert.equal(historicalDispatchIncident(c,missing),null);
 assert.equal(deployedDispatchIncident(c,'CT-REMOVED'),null);
 assert.equal(validatedDispatchIncident(c,null),null);
 assert.equal(JSON.stringify(c),before);
});

test('D5.0 follow-up identity requires a REAL recorded predecessor',()=>{
 const c=newDispatchPilotCampaign(44);
 const earlier=c.contracts[0],current=c.contracts[1];
 const accepted={...c,activeContractId:current.id,
  contracts:c.contracts.map(x=>x.id===current.id?
   {...x,status:'accepted',followUpOf:earlier.id}:x),
  history:[]};
 const first=deployedDispatchIncident(accepted,current.id);
 assert.ok(first);
 assert.equal(first.followUp,undefined);
 const withReport={...accepted,history:[{id:'old',contractId:earlier.id,
  day:1,outcome:'failure',grade:'D',elapsed:20,participatingIds:[],
  casualties:[],objective:false,events:[]}]};
 const after=deployedDispatchIncident(withReport,current.id);
 assert.equal(after.followUp.contractId,earlier.id);
 assert.equal(after.followUp.outcome,'failure');
});
