import test from 'node:test';
import assert from 'node:assert/strict';
import {escortUsesFriendlySoftTraffic} from '../src/breach-civilian-mission.ts';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,toggling,stepSession}
 from '../src/breach-game.ts';
import {setCivilianState} from '../src/breach-civilian-types.ts';
import {activateSite} from '../src/breach-core.ts';
import {sweptBodyClear} from '../src/breach-navigation.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';

test('EQA3.8 friendly crowd exception only belongs to a living real FOLLOW',()=>{
 const a={health:1,state:'escorted',following:'rook'};
 assert.equal(escortUsesFriendlySoftTraffic(a),true);
 for(const override of [{following:null},{state:'compliant'},
     {state:'fleeing'},{health:0}])
  assert.equal(escortUsesFriendlySoftTraffic({...a,...override}),false);
});
test('EQA3.8 real Warehouse17 extraction no longer cages the wounded follower between initial blue squad',()=>{
 const site=generateSite(17,'small',undefined,
   {mission:'rescue',enableIncidentIntent:true});
 const s=newSession(0,17,'floor-plan','small','rescue',site,
   {enableCivilians:true});
 try{
  const blue=team(s),rook=blue[0];
  const person=s.civilians.find(c=>c.rescueTarget);
  assert.ok(person,'same physical rescue target as EQA3.6');
  // Reproduce actual witness precisely: operator has reached extraction
  // while an injured follower is wedged between two original teammates.
  // Disable combat to isolate the navigation authority, not to hide
  // casualties in the full 110s operational CI that runs independently.
  for(const red of enemies(s))red.health=0;
  s.civilians=s.civilians.filter(c=>c===person);
  const extract=s.scenario.extract;
  assert.ok(Math.abs(extract.x-502)<1&&Math.abs(extract.y-253.63)<1);
  rook.p={x:497.5,y:253.64};rook.priorP={...rook.p};
  person.p={x:449.45,y:253.73};person.priorP={...person.p};
  person.health=1;person.injuryStage=1;
  setCivilianState(person,'escorted',0);
  person.following=rook.id;
  s.rescue.following=rook.id;s.rescue.p={...person.p};
  s.mission='extract';
  const stationed=blue.filter(a=>a!==rook&&a.health>0);
  assert.ok(stationed.some(a=>Math.hypot(a.p.x-459,a.p.y-235.63)<2));
  assert.ok(stationed.some(a=>Math.hypot(a.p.x-459,a.p.y-271.63)<2));
  const to={x:474.5,y:253.68};
  assert.equal(sweptBodyClear(person.p,to,s.doors,9,
    sessionWorldGeometry(s)),true,'the gap has no blocking static world geometry');
  toggling(s);
  for(let i=0;i<360&&s.phase==='running';i++)stepSession(s,1/60);
  assert.ok(person.p.x>464,
    'the real 60Hz follower must pass two idle friendly teammates (was stuck at x449.45): '+person.p.x);
  assert.ok(person.following===rook.id||s.mission==='done',
    'friendly passage must not silently break actual FOLLOW custody');
  assert.equal(s.mission,'done',
    'physical rescue person actually reaches valid extraction range');
 }finally{activateSite(null);}
});
