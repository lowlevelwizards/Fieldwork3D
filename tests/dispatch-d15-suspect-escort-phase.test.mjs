import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,enemies,team} from '../src/breach-game.ts';
import {advanceSimulationActors} from '../src/breach-simulation-actor-phase.ts';
import {activateSite} from '../src/breach-core.ts';
import {physicalFollowGoal} from '../src/breach-follow-physical-policy.ts';
test('D15.5 restrained red actor uses custody motion instead of enemy AI',()=>{
 const s=newSession(0,4);
 try{
  const leader=team(s)[0],prisoner=enemies(s)[0];
  leader.p={x:325,y:350};leader.priorP={x:315,y:350};
  leader.velocity=45;leader.health=2;
  prisoner.p={x:255,y:350};prisoner.priorP={...prisoner.p};
  prisoner.health=2;prisoner.surrendered=true;
  prisoner.restrained=true;prisoner.escortLeaderId=leader.id;
  prisoner.lastEscortRouteAt=-100;prisoner.escortGoal=null;
  let movement=0,hostilePolicy=0;
  const ports={notify:()=>{},battleEvent:()=>{},unobstructed:()=>false,
   defensivePosition:()=>null,runFriendly:()=>{},
   decideEnemy:()=>{hostilePolicy++;},
   runCustody:(_s,a,goal)=>{movement++;a.p={...goal};}};
  advanceSimulationActors(s,1/60,ports);
  assert.equal(movement,1,'custody uses the physical motor port');
  assert.equal(hostilePolicy,0,'no armed hostile decision for surrender');
  assert.deepEqual(prisoner.p,physicalFollowGoal(leader,{p:{x:255,y:350}}));
  assert.equal(prisoner.escortLeaderId,leader.id);
  leader.health=0;
  advanceSimulationActors(s,1/60,ports);
  assert.equal(movement,1,'down escort cannot drive the prisoner');
  assert.equal(prisoner.escortLeaderId,null);
  assert.equal(prisoner.velocity,0);
 }finally{activateSite(null);}
});
