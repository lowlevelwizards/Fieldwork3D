/** OC1/2/6: physical withdrawal and partial settlement must remain truthful. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {requestWithdrawal,canConcludeWithdrawal,deriveOperationOutcome}
 from '../src/breach-operation-outcomes.ts';
import {assessOperation} from '../src/breach-operations.ts';
import {newCampaign,acceptContract,resolveOperation,campaignIntelBalance}
 from '../src/campaign-state.ts';

const person=(id,x,health=4)=>({id,side:'blue',health,p:{x,y:0}});
const state=()=>({
 started:true,phase:'running',mission:'clear',
 scenario:{extract:{x:100,y:0}},operators:[
  person('rook',0),person('moss',99),person('ash',140,0)],
 withdrawalRequested:false
});

test('OC2 withdrawal request is reversible intent, never instant extraction',()=>{
 const s=state();
 assert.equal(requestWithdrawal(s),true);
 assert.equal(s.phase,'running');
 assert.equal(canConcludeWithdrawal(s),false);
 assert.equal(requestWithdrawal(s),false,'cannot double-author same decision');
 s.operators[0].p.x=100;
 assert.equal(canConcludeWithdrawal(s),true,
  'all mobile operators physically at extraction; downed person may remain');
 assert.equal(s.operators[2].p.x,140,'no casualty teleport');
 const training={...state(),site:{training:true}};
 assert.equal(requestWithdrawal(training),false);
 const beforeGo={...state(),started:false};
 assert.equal(requestWithdrawal(beforeGo),false);
});

test('OC1 classifies withdrawal, secured objectives and unrecovered personnel separately',()=>{
 const s=state();
 s.withdrawalRequested=true;
 s.withdrawalCompleted=true;
 s.phase='lost';
 s.mission='extract';
 s.operators[0].p.x=100;
 const o=deriveOperationOutcome(s);
 assert.equal(o.disposition,'withdrawn');
 assert.equal(o.objectiveSecured,true);
 assert.deepEqual(o.extractedOperatorIds,['rook','moss']);
 assert.deepEqual(o.evacuatedCasualtyIds,[]);
 assert.deepEqual(o.leftBehindOperatorIds,['ash']);
 s.operators[2].p.x=100;
 assert.deepEqual(deriveOperationOutcome(s).evacuatedCasualtyIds,['ash']);
 assert.deepEqual(deriveOperationOutcome({...s,phase:'won'}).leftBehindOperatorIds,[]);
 assert.equal(deriveOperationOutcome({...s,phase:'won'}).disposition,'completed');
 assert.equal(deriveOperationOutcome({...s,withdrawalCompleted:false}).disposition,
  'failed','a requested withdrawal is not a completed evacuation');
});

test('OC1 score rewards actual casualty evacuation and nonbinary withdrawal grade',()=>{
 const data={outcome:'failure',disposition:'withdrawn',kind:'clear',
  elapsed:85,casualties:1,teamSize:3,shots:10,hits:5,objective:false,extracted:2};
 const base=assessOperation(data,true);
 const rescued=assessOperation({...data,evacuatedCasualties:1},true);
 assert.equal(base.grade,'D');
 assert.ok(rescued.score>base.score);
 assert.ok(rescued.scoreComponents.some(c=>c.label==='CASUALTIES EVACUATED'));
 assert.equal(assessOperation({...data,disposition:'failed'}).grade,'F');
});

test('OC4 unrecovered casualty becomes MIA, not healed or declared dead',()=>{
 const original=newCampaign(8829),job=original.contracts[0];
 const c=acceptContract(original,job.id);
 const report={id:'mia-'+job.id,contractId:job.id,day:c.day,
  outcome:'failure',disposition:'withdrawn',grade:'D',elapsed:121,
  participatingIds:['rook','moss'],casualties:['moss'],
  stabilizedIds:[],evacuatedIds:[],extractedIds:['rook'],
  leftBehindIds:['moss'],objective:false,events:[]};
 const result=resolveOperation(c,report);
 const moss=result.operators.find(o=>o.id==='moss');
 assert.equal(moss.status,'lost','missing cannot deploy or self-heal');
 assert.equal(moss.missingSinceOperationId,report.id,'fate remains explicit');
 assert.equal(result.journal.filter(e=>e.kind==='withdrawal'&&
  e.operatorId==='moss').length,0,'missing casualty did not withdraw');
 assert.ok(result.journal.some(e=>e.kind==='operator-missing'&&
  e.operatorId==='moss'&&e.detail.includes('unconfirmed')));
 assert.equal(result.operators.find(o=>o.id==='rook').status,'available');
 assert.deepEqual(resolveOperation(result,report),result);
});

test('OC6 withdrawn operations keep verified partial intel, but never double reward',()=>{
 const base=newCampaign(9021),job=base.contracts[0];
 const c=acceptContract(base,job.id),before=campaignIntelBalance(c);
 const report={id:'operation-'+job.id,contractId:job.id,day:c.day,
  outcome:'failure',disposition:'withdrawn',grade:'D',elapsed:80,
  participatingIds:['rook','moss'],casualties:['moss'],
  stabilizedIds:['moss'],evacuatedIds:['moss'],extractedIds:['rook'],
  leftBehindIds:[],objective:false,objectiveSecured:false,
  intelRecovered:2,intelRecoveryBy:{rook:2},events:[]};
 const next=resolveOperation(c,report);
 assert.equal(campaignIntelBalance(next),Math.min(9,before+2));
 assert.equal(next.history.at(-1).disposition,'withdrawn');
 assert.equal(next.history.at(-1).intelRecovered,2);
 assert.ok(next.journal.some(e=>e.kind==='casualty-evacuated'));
 assert.equal(next.journal.filter(e=>e.kind==='intel-recovered'&&
  e.operatorId==='rook').length,1,'one evidence recovery career credit');
 const followup=next.contracts.find(k=>k.followUpOf===job.id);
 assert.ok(followup,'two real recovered intel pieces generate an actionable follow-up');
 assert.equal(followup.objectiveIntel,'approximate',
  'follow-up is more informed, not omniscient');
 assert.ok(followup.description.includes('physically recovered intelligence'));
 assert.deepEqual(resolveOperation(next,report),next,'one operation id, one reward');
 assert.deepEqual(c,acceptContract(base,job.id),'pure settlement');
 const withoutEvidence=resolveOperation(c,{...report,id:'no-evidence-'+job.id,
  intelRecovered:0});
 assert.equal(withoutEvidence.contracts.some(k=>k.followUpOf===job.id),false,
  'failure with no recovered evidence must not invent a new lead');
});
