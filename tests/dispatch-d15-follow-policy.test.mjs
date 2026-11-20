import test from 'node:test';
import assert from 'node:assert/strict';
import {physicalFollowGoal,physicalFollowerSeparated,
 physicalEscortWalkMultiplier,FOLLOW_SEPARATION_LIMIT}
 from '../src/breach-follow-physical-policy.ts';
import {rescueFollowGoal,escortWalkMultiplier,rescueEscortSeparated}
 from '../src/breach-civilian-mission.ts';
const p=(x,y)=>({x,y});
test('D15.5 movement policy follows actual travel, not barrel heading',()=>{
 const leader={p:p(120,140),priorP:p(110,140),heading:Math.PI/2,velocity:48};
 const goal=physicalFollowGoal(leader,{p:p(90,140)});
 assert.ok(goal.x<leader.p.x,'behind actual eastward travel');
 assert.ok(Math.abs(goal.y-140)<1e-9,'no sideways rifle-follow');
 assert.deepEqual(rescueFollowGoal(leader,{p:p(90,140)}),goal,
  'civilian movement uses the same physical policy');
});
test('D15.5 leader loss and clear spacing thresholds are shared',()=>{
 const person={p:p(0,0),health:2,injuryStage:0,following:'blue',
  state:'escorted'};
 const leader={id:'blue',p:p(107,0),health:2};
 assert.equal(FOLLOW_SEPARATION_LIMIT,125);
 assert.equal(physicalFollowerSeparated(person,leader),false);
 assert.equal(rescueEscortSeparated(person,leader),false);
 assert.equal(physicalEscortWalkMultiplier(leader,person),0.78*.45);
 assert.equal(escortWalkMultiplier(leader,person),0.78*.45);
 assert.equal(physicalFollowerSeparated(person,{...leader,p:p(126,0)}),true);
 assert.equal(physicalFollowerSeparated(person,null),true);
 assert.equal(physicalEscortWalkMultiplier({...leader,p:p(110,0)},person),0);
});
