import test from 'node:test';import assert from 'node:assert/strict';
import {initialRoster,applyRosterIdentity,recordRosterMission} from '../src/breach-roster.ts';
import {newSession,team} from '../src/breach-game.ts';
test('mission injury persists into next encounter and recovers between operations',()=>{
 const s=newSession();const a=team(s)[0];a.injuryStage=2;a.health=2;
 s.phase='won';
 const wounded=recordRosterMission(s,initialRoster());
 const m=wounded.members.find(x=>x.id===a.id);
 assert.equal(m.injuries,2);assert.ok(m.recovery>=3);
 const later=newSession();applyRosterIdentity(later,wounded);
 assert.ok(team(later)[0].injuryStage>=2);
 team(later)[0].injuryStage=0;team(later)[0].health=4;
 later.phase='won';
 let recovering=recordRosterMission(later,wounded);
 assert.ok(recovering.members[0].recovery<m.recovery);
 for(let i=0;i<6;i++){
  const clear=newSession();clear.phase='won';
  recovering=recordRosterMission(clear,recovering);
 }
 assert.equal(recovering.members[0].recovery,0);
 assert.equal(recovering.members[0].injuries,0);
});
