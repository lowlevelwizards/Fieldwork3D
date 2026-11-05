import test from 'node:test';
import assert from 'node:assert/strict';
import {
 stableCoordination,coordinationLeaseSeconds,renewCoordinationUntil
} from '../src/breach-ai-team-commitment.ts';
import {groupResponse} from '../src/breach-ai-coordination.ts';

test('live assignments stay stable when a new group member hears a report',()=>{
 const members=[
  {id:'A',coordinationRole:'investigate',coordinationUntil:11},
  {id:'B',coordinationRole:'watch',coordinationUntil:12},
  {id:'C',coordinationRole:null,coordinationUntil:0}
 ];
 const prior=stableCoordination(members,6);
 const positions=[
  {id:'A',p:{x:100,y:0}},
  {id:'B',p:{x:90,y:0}},
  {id:'C',p:{x:5,y:0}}
 ];
 const roles=groupResponse(positions,{x:0,y:0},prior);
 assert.equal(roles.A,'investigate');
 assert.equal(roles.B,'watch');
 assert.equal(roles.C,'support');
 assert.deepEqual(stableCoordination(members,12),{});
});

test('commitment durations are finite and extend only with new reports',()=>{
 const near=coordinationLeaseSeconds('watch',20);
 const vague=coordinationLeaseSeconds('watch',200);
 assert.ok(vague>near&&vague<=11.5);
 const until=renewCoordinationUntil(5,8,'watch',70);
 assert.ok(until>8&&until<=16.5);
 assert.equal(renewCoordinationUntil(1,until,'watch',0),until);
});
