import test from 'node:test';import assert from 'node:assert/strict';
import {newCampaign,acceptContract,resolveOperation,readCampaign} from '../src/campaign-state.ts';
test('combat proficiency and injuries advance only after a committed operation',()=>{
 const initial=newCampaign(123),job=initial.contracts[0];
 const active=acceptContract(initial,job.id);
 const r={id:'mission-123',contractId:job.id,day:1,outcome:'success',grade:'A',elapsed:120,
 participatingIds:['rook'],casualties:[],objective:true,events:[],
 performance:[{id:'rook',shots:16,hits:9,pointShots:10,aimedShots:6,
 longHits:3,injuryStage:1,survived:true,magazine:4,reserve:20}]};
 const done=resolveOperation(active,r);
 const before=initial.operators[0],after=done.operators[0];
 assert.ok(after.skills.pointShooting>before.skills.pointShooting);
 assert.ok(after.skills.longRange>before.skills.longRange);
 assert.ok(after.skills.composure>before.skills.composure);
 assert.ok(after.recoveryDays>0);
 assert.equal(after.magazine,4);
 assert.equal(after.shotsFired,16);
 assert.equal(done.operators[1].missions,0);
 assert.equal(done.history[0].gains?.[0].id,'rook');
 assert.ok(done.journal.some(e=>e.kind==='first-deployment'&&e.operatorId==='rook'));
 assert.ok(done.journal.some(e=>e.kind==='wounded'));
 assert.deepEqual(resolveOperation(done,r),done);
 assert.deepEqual(readCampaign(JSON.stringify(done)),done);
});