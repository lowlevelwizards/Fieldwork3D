import test from 'node:test';
import assert from 'node:assert/strict';
import {newCampaign,acceptContract,resolveOperation,readCampaign,
 campaignSquadPresent} from '../src/campaign-state.ts';
import {installMissingPersonRecovery,verifiedMissingPersonRecovery}
 from '../src/breach-missing-recovery.ts';
import {newSession,stepSession} from '../src/breach-game.ts';
import {takeCivilianCustody} from '../src/breach-civilian-transport.ts';
import {casualtyTrailingPosition} from '../src/breach-casualty-transport.ts';

const missingReport=(c,job)=>({
 id:'mia-'+job.id,contractId:job.id,day:c.day,outcome:'failure',
 disposition:'withdrawn',grade:'D',elapsed:81,
 participatingIds:['rook','moss'],casualties:['moss'],
 stabilizedIds:[],evacuatedIds:[],extractedIds:['rook'],
 leftBehindIds:['moss'],objective:false,events:[]
});
test('OC9 downed missing veteran generates one linked physical rescue case',()=>{
 const start=newCampaign(1731),job=start.contracts[0];
 const deployed=acceptContract(start,job.id);
 const report=missingReport(deployed,job);
 const result=resolveOperation(deployed,report);
 const veteran=result.operators.find(a=>a.id==='moss');
 assert.equal(veteran.status,'lost');
 assert.equal(veteran.missingSinceOperationId,'mia-'+job.id);
 const rescue=result.contracts.find(c=>c.recoveryOperatorId==='moss');
 assert.ok(rescue);
 assert.equal(rescue.kind,'rescue');
 assert.equal(rescue.objectiveIntel,'approximate');
 assert.ok(rescue.title.includes(veteran.callsign));
 assert.equal(rescue.followUpOf,job.id);
 assert.deepEqual(resolveOperation(result,report),result);
 assert.ok(readCampaign(JSON.stringify(result)));
});
test('OC9 recovery requires completed physical casualty custody, never proximity',()=>{
 const s=newSession(0,73219,'floor-plan','standard','rescue');
 assert.equal(installMissingPersonRecovery(s,'moss'),true);
 assert.equal(installMissingPersonRecovery(s,'moss'),false);
 const patient=s.civilians.find(c=>c.rescueTarget);
 assert.ok(patient);
 assert.equal(patient.health,0);
 assert.equal(patient.state,'incapacitated');
 assert.equal(verifiedMissingPersonRecovery(s),null);
 s.phase='won';s.mission='done';
 assert.equal(verifiedMissingPersonRecovery(s),null);
 const carrier=s.operators.find(a=>a.id==='rook');
 patient.carriedById=carrier.id;
 carrier.carryingId=patient.id;
 assert.equal(verifiedMissingPersonRecovery(s),null,'body still in building');
 patient.p={...s.scenario.extract};
 carrier.p={...s.scenario.extract};
 assert.deepEqual(verifiedMissingPersonRecovery(s),{
  operatorId:'moss',carrierId:'rook'});
 carrier.health=0;
 assert.equal(verifiedMissingPersonRecovery(s),null,'downed carrier cannot verify');
});
test('OC9 mission rescue restores same career only once with prolonged care',()=>{
 const start=newCampaign(1732),first=start.contracts[0];
 let c=acceptContract(start,first.id);
 c=resolveOperation(c,missingReport(c,first));
 const recovery=c.contracts.find(a=>a.recoveryOperatorId==='moss');
 assert.ok(recovery);
 let accepted=acceptContract(c,recovery.id);
 assert.equal(accepted.activeContractId,recovery.id);
 const record={id:'rescue-'+recovery.id,contractId:recovery.id,day:accepted.day,
  outcome:'success',grade:'B',elapsed:145,
  participatingIds:['rook','ash','vale'],casualties:[],
  evacuatedIds:[],extractedIds:['rook','ash','vale'],objective:true,
  missingRecoveredId:'moss',missingRecoveredBy:'rook',events:[]};
 const next=resolveOperation(accepted,record);
 const veteran=next.operators.find(a=>a.id==='moss');
 assert.equal(veteran.status,'reserve');
 assert.equal(veteran.missingSinceOperationId,undefined);
 assert.ok(veteran.recoveryDays>=5);
 assert.equal(campaignSquadPresent(next),false,
  'post-evacuation medical recovery blocks immediate redeployment');
 const event=next.journal.filter(e=>e.kind==='operator-recovered');
 assert.equal(event.length,1);
 assert.equal(event[0].operatorId,'moss');
 assert.equal(event[0].otherOperatorId,'rook');
 assert.deepEqual(resolveOperation(next,record),next);
 assert.ok(readCampaign(JSON.stringify(next)));
});
test('OC9 failed recovery cannot reinstate, but grants a linked retry',()=>{
 const start=newCampaign(1733),first=start.contracts[0];
 let c=acceptContract(start,first.id);
 c=resolveOperation(c,missingReport(c,first));
 const recovery=c.contracts.find(a=>a.recoveryOperatorId==='moss');
 c=acceptContract(c,recovery.id);
 const bogus={id:'failed-'+recovery.id,contractId:recovery.id,day:c.day,
  outcome:'failure',grade:'F',elapsed:44,participatingIds:['rook'],
  casualties:[],objective:false,events:[],missingRecoveredId:'moss'};
 const next=resolveOperation(c,bogus);
 assert.equal(next.operators.find(a=>a.id==='moss').status,'lost');
 assert.equal(next.journal.filter(e=>e.kind==='operator-recovered').length,0);
 const retry=next.contracts.find(k=>k.followUpOf===recovery.id&&
   k.recoveryOperatorId==='moss');
 assert.ok(retry,'failed transport must leave a second attempt');
 assert.deepEqual(resolveOperation(next,bogus),next);
});

test('OC9 fixed-step rescue cannot win by proximity, only real casualty custody',()=>{
 const s=newSession(0,90019,'floor-plan','standard','rescue');
 assert.equal(installMissingPersonRecovery(s,'moss'),true);
 const casualty=s.civilians.find(c=>c.rescueTarget);
 const carrier=s.operators.find(a=>a.id==='rook');
 assert.ok(casualty&&carrier);
 const exit={...s.scenario.extract};
 // Keep the carried patient a real carry-gap away from the operator.
 // Placing two hard bodies in exactly the same coordinates creates a
 // physically impossible initial overlap before the mission gate runs.
 const carriedAt=casualtyTrailingPosition(exit,exit,carrier.heading,'carry');
 casualty.p={...carriedAt};casualty.priorP={...carriedAt};
 carrier.p={...exit};carrier.priorP={...exit};
 carrier.plan.length=0;carrier.path.length=0;
 s.started=true;s.phase='running';s.mission='extract';
 stepSession(s,1/60);
 assert.equal(s.phase,'running',
  'unsecured downed body touching exit cannot complete mission');
 assert.equal(verifiedMissingPersonRecovery(s),null);
 assert.equal(takeCivilianCustody(casualty,carrier,'carry'),true);
 for(let i=0;i<45&&s.phase==='running';i++)stepSession(s,1/60);
 assert.equal(s.phase,'won',
  'physical carry custody inside exit must complete without remote wins; '+
  'mission='+s.mission+', carrier='+JSON.stringify(carrier.p)+
  ', patient='+JSON.stringify(casualty.p)+
  ', custody='+String(casualty.carriedById)+', carrierHealth='+carrier.health);
 assert.deepEqual(verifiedMissingPersonRecovery(s),{
  operatorId:'moss',carrierId:'rook'});
});
