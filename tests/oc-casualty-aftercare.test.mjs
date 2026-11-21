import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCampaignAftercare,aftercareDescription}
 from '../src/campaign-casualty-aftercare.ts';
import {newCampaign,acceptContract,resolveOperation}
 from '../src/campaign-state.ts';

const prognosis=(patch={})=>assessCampaignAftercare({
 downed:true,evacuated:true,leftBehind:false,stabilized:false,
 critical:false,structured:true,injuryStage:3,...patch
});
test('OC11 critical, stabilized, unverified and missing have distinct aftercare',()=>{
 const critical=prognosis({critical:true}),stable=prognosis({stabilized:true});
 const unknown=prognosis(),missing=prognosis({leftBehind:true});
 assert.equal(critical.category,'critical-evacuation');
 assert.ok(critical.recoveryDays>unknown.recoveryDays);
 assert.ok(unknown.recoveryDays>stable.recoveryDays);
 assert.equal(stable.recoveryDays,4);
 assert.equal(missing.category,'missing');
 assert.match(aftercareDescription(missing),/unconfirmed/);
 assert.equal(prognosis({structured:false,critical:true}).recoveryDays,2,
   'legacy triage is missing evidence, never invented');
 assert.equal(prognosis({downed:false,injuryStage:0}).recoveryDays,0);
 assert.equal(prognosis({downed:false,injuryStage:2}).recoveryDays,4);
});
function resolveWith(reportPatch,operatorPatch={}){
 const original=newCampaign(73131);
 const base={...original,operators:original.operators.map(a=>
  a.id==='moss'?{...a,...operatorPatch}:a)};
 const job=base.contracts[0],active=acceptContract(base,job.id);
 const report={id:'op-'+job.id,contractId:job.id,day:active.day,
   outcome:'failure',grade:'D',elapsed:160,
   participatingIds:['rook','moss'],casualties:['moss'],
   evacuatedIds:['moss'],extractedIds:['rook'],leftBehindIds:[],
   objective:false,events:[],...reportPatch};
 return {result:resolveOperation(active,report),report,active};
}
test('OC11 physical evacuation and recorded severity set bounded recovery days',()=>{
 const stable=resolveWith({stabilizedIds:['moss'],criticalIds:[]});
 const critical=resolveWith({stabilizedIds:[],criticalIds:['moss']});
 const unknown=resolveWith({stabilizedIds:[],criticalIds:[]});
 const getDays=x=>x.result.operators.find(a=>a.id==='moss').recoveryDays;
 assert.equal(getDays(stable),4);
 assert.equal(getDays(critical),8);
 assert.equal(getDays(unknown),6);
 const log=critical.result.journal.find(e=>e.kind==='casualty-aftercare');
 assert.ok(log&&log.detail.includes('Critical casualty physically evacuated'));
 assert.deepEqual(resolveOperation(critical.result,critical.report),critical.result,
   'duplicate settlement cannot reroll or double-credit triage');
});
test('OC11 progression does not subtract medical time twice',()=>{
 const original=newCampaign(73132);
 const base={...original,operators:original.operators.map(a=>
  a.id==='rook'?{...a,recoveryDays:5}:a)};
 const job=base.contracts[0],c=acceptContract(base,job.id);
 const report={id:'op-'+job.id,contractId:job.id,day:c.day,
  outcome:'failure',grade:'D',elapsed:90,
  participatingIds:['rook'],casualties:[],objective:false,events:[],
  performance:[{id:'rook',shots:0,hits:0,pointShots:0,aimedShots:0,
   longHits:0,injuryStage:0,survived:true,magazine:30,reserve:120}]};
 const next=resolveOperation(c,report);
 assert.equal(next.operators.find(a=>a.id==='rook').recoveryDays,4,
  'one campaign day should pass, even with advancement enabled');
});
