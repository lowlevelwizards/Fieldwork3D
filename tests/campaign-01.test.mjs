import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,readCampaign,acceptContract,resolveOperation,migrateLegacyRoster} from '../src/campaign-state.ts';
import {initialRoster} from '../src/breach-roster.ts';
test('campaign initializes deterministically and retains independent operators',()=>{
 const c=newCampaign(42);
 assert.deepEqual(newCampaign(42),c);assert.equal(c.operators.length,4);
 assert.equal(c.contracts.filter(k=>k.status==='available').length,3);
 assert.notEqual(c.operators[0].skills.handling,c.operators[1].skills.handling);
 assert.deepEqual(readCampaign(JSON.stringify(c)),c);
 assert.equal(readCampaign('{broken'),null);
});
test('legacy roster migrates without changing its identity',()=>{
 const legacy=initialRoster();legacy.members[0].missions=5;
 const c=migrateLegacyRoster(newCampaign(2),legacy);
 assert.equal(c.operators[0].missions,5);
 assert.equal(c.operators[0].id,'rook');
});
test('mission settlement is idempotent and advances an actual contract',()=>{
 const first=newCampaign(11);const ct=first.contracts[0];
 const accepted=acceptContract(first,ct.id);
 const report={id:'op-11',contractId:ct.id,day:1,outcome:'success',grade:'A',
 elapsed:55,participatingIds:['rook','moss'],casualties:['moss'],objective:true,events:[]};
 const done=resolveOperation(accepted,report);
 assert.equal(done.day,2);assert.equal(done.funds,first.funds+ct.reward);
 assert.equal(done.operators[0].missions,1);assert.equal(done.operators[2].missions,0);
 assert.equal(done.operators[1].recoveryDays,2);
 assert.deepEqual(resolveOperation(done,report),done);
 assert.deepEqual(acceptContract(accepted,ct.id),accepted);
});