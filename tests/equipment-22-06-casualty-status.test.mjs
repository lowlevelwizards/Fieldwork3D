import test from 'node:test';import assert from 'node:assert/strict';
import {newMedicalCondition,registerWound,stabilizeWound}
 from '../src/breach-medical-wounds.ts';
import {casualtyCondition} from '../src/breach-casualty-status.ts';
import {newSession,debrief} from '../src/breach-game.ts';
import {newCampaign,acceptContract,resolveOperation} from '../src/campaign-state.ts';
test('22.06 downed and stabilized differ; stabilization never revives',()=>{
 const c=newMedicalCondition();registerWound(c,12,'arm',2,0);
 assert.equal(casualtyCondition(0,3,c),'critical');
 assert.equal(stabilizeWound(c,12),true);
 assert.equal(casualtyCondition(0,3,c),'stabilized');
 assert.equal(casualtyCondition(2,2,c),'heavy-wound');
});
test('22.06 debrief separates critical and stabilized',()=>{
 const s=newSession(),a=s.operators.find(o=>o.id==='rook');
 registerWound(a.medical,12,'leg',2,0);a.health=0;a.injuryStage=3;
 assert.deepEqual(debrief(s).criticalCasualties,['rook']);
 stabilizeWound(a.medical,12);
 assert.deepEqual(debrief(s).stabilizedCasualties,['rook']);
});
test('22.06 stabilized casualty has shorter campaign recovery, applied once',()=>{
 const c=newCampaign(77),contract=c.contracts[0];const accepted=acceptContract(c,contract.id);
 const report={id:'test-22-06',contractId:contract.id,day:accepted.day,
  outcome:'failure',grade:'C',elapsed:42,participatingIds:['rook','moss'],
  casualties:['rook','moss'],stabilizedIds:['rook'],criticalIds:['moss'],
  objective:false,events:[]};
 const next=resolveOperation(accepted,report);
 assert.ok(next.operators.find(o=>o.id==='moss').recoveryDays>
  next.operators.find(o=>o.id==='rook').recoveryDays);
 assert.equal(resolveOperation(next,report),next);
});
