import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,enemies,team,planSuspectRestraint,toggling,stepSession}
 from '../src/breach-game.ts';
import {commitSuspectSurrender} from '../src/breach-suspect-compliance.ts';
import {activateSite} from '../src/breach-core.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
test('D15.3 custody is optional and requires issued cuffs',()=>{
 const options={door:false,node:false,posture:'stand',pace:'walk',
  firePolicy:'engage',reserve:0,magazine:10,flashRemaining:0,
  nearRestrainableSuspect:true,restraintsRemaining:1};
 assert.ok(contextActionChoices(options).some(x=>x.id==='ctxRestrainSuspect'));
 assert.ok(!contextActionChoices({...options,restraintsRemaining:0})
  .some(x=>x.id==='ctxRestrainSuspect'));
});
test('D15.3 real GO restraint consumes one pair after physical contact',()=>{
 const s=newSession(0,4);
 try{
  const a=team(s)[0],target=enemies(s)[0];
  for(const blue of team(s))if(blue!==a)blue.health=0;
  for(const red of enemies(s))if(red!==target)red.health=0;
  target.p={x:a.p.x+15,y:a.p.y};target.priorP={...target.p};
  target.heading=a.heading;
  assert.equal(commitSuspectSurrender(s,target,()=>{},()=>{}),true);
  a.restraintRemaining=2;
  assert.equal(planSuspectRestraint(s,a.id,target.id),true);
  assert.equal(target.restrained===true,false,'planning cannot cuff');
  toggling(s);
  for(let i=0;i<130&&s.phase==='running'&&!target.restrained;i++)stepSession(s,1/60);
  assert.equal(target.restrained,true);
  assert.equal(a.restraintRemaining,1);
  const film=snapshot(s);
  target.restrained=false;a.restraintRemaining=0;
  applyReplayFrame(s,film);
  assert.equal(enemies(s).find(x=>x.id===target.id)?.restrained,true);
  assert.equal(team(s)[0].restraintRemaining,1);
 }finally{activateSite(null);}
});
