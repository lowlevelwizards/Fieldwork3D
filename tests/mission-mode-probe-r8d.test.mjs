import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,planMove,stepSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {assessMissionFilm} from '../src/breach-mission-quality.ts';
import {activateSite} from '../src/breach-core.ts';
test('R8D: floor-plan and fog-on modes retain stable actual physics',()=>{
 try{
  const site=generateSite(11,'small',undefined,{mission:'clear'});
  const trials=[];
  for(const intelMode of ['floor-plan','true-blind']){
   const session=newSession(0,11,intelMode,'small','clear',site);
   for(const actor of team(session).slice(0,2))
    planMove(session,actor.id,site.entrance);
   const record=new MissionRecorder();record.capture(session,true);
   session.started=true;session.phase='running';
   for(let i=0;i<90&&session.phase==='running';i++){
    stepSession(session,1/30);record.capture(session);
   }
   record.capture(session,true);
   assert.deepEqual(assessMissionFilm(record.frames,record.events,
     session.operators.length).issues,[]);
   assert.ok(record.frames.length>1);
   trials.push(record.frames.at(-1).actors.map(a=>({id:a.id,health:a.health})));
  }
  assert.deepEqual(trials[0],trials[1]);
 }finally{activateSite(null);}
});
