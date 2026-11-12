import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {missionGroupResponse,groupResponse} from '../src/breach-ai-coordination.ts';
const p=(x,y)=>({x,y});
const near=[{id:'sentinel',role:'sentry',p:p(94,0)},
 {id:'mobile',role:'investigator',p:p(150,0)},
 {id:'reserve',role:'reserve',p:p(35,0)}],threat=p(100,0),post=p(90,0);
test('R6.2 objective guard watches actual approach while mobile ally investigates',()=>{
 const first=groupResponse(near,threat);
 assert.equal(first.sentinel,'investigate','baseline nearest guard would chase');
 const response=missionGroupResponse(near,threat,{},'intel',post);
 assert.equal(response.sentinel,'watch');
 assert.equal(response.mobile,'investigate');
 assert.ok(Object.values(response).includes('support'));
 assert.deepEqual(missionGroupResponse([...near].reverse(),threat,{},'intel',post),
   response,'group choices do not depend on actor iteration order');
});
test('R6.2 a confirmed prior assignment and non-objective mission remain authoritative',()=>{
 const ordinary=groupResponse(near,threat);
 assert.deepEqual(missionGroupResponse(near,threat,{},'clear',post),ordinary);
 const kept=missionGroupResponse(near,threat,{sentinel:'investigate'},'hold',post);
 assert.equal(kept.sentinel,'investigate','never forcibly cancel an active commitment');
 assert.deepEqual(missionGroupResponse([near[0]],threat,{},'hold',post),
  {sentinel:'investigate'},'a lone listener remains a lone investigator');
 assert.deepEqual(missionGroupResponse(near,threat,{},'intel',p(800,800)),
  ordinary,'a remote objective grants no special tactical knowledge');
});
test('R6.2 group roles depend on delivered listeners and existing actor assignments',()=>{
 const src=readFileSync(new URL('../src/breach-enemy-decision-controller.ts',import.meta.url),'utf8');
 assert.match(src,/missionGroupResponse\(participants,report\.estimate,/);
 assert.match(src,/report\.deliveredTo\.includes\(a\.id\)/);
 assert.match(src,/role:a\.encounterRole/);
 assert.match(src,/committed,s\.missionType,s\.scenario\.objective/);
});
