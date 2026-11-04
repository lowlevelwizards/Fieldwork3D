import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,stepSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {assessMissionFilm,summarizeMissionSamples} from
 '../src/breach-mission-quality.ts';
import {activateSite} from '../src/breach-core.ts';

test('R5: replay frames are monotonic and scrubbing is non-mutating',()=>{
 try{
  for(const seed of [11,12]){
   const kind=seed===11?'rescue':'intel';
   const site=generateSite(seed,'small',undefined,{mission:kind});
   const s=newSession(0,seed,'floor-plan','small',kind,site);
   const film=new MissionRecorder();
   film.capture(s,true);s.phase='running';
   for(let i=0;i<25;i++){stepSession(s,1/60);film.capture(s);}
   film.capture(s,true);
   assert.deepEqual(assessMissionFilm(film.frames,film.events,
    s.operators.length).issues,[]);
   assert.ok(film.frames.length>=4);
   const before=film.at(.1);
   assert.deepEqual(film.at(.1),before);
  }
 }finally{activateSite(null);}
});
test('R5: chronology catches extraction before objective',()=>{
 const frame={t:5,mission:'done',actors:[],rescue:null};
 const events=[{id:1,t:4,kind:'objective',text:'MISSION COMPLETE'},
  {id:2,t:5,kind:'objective',text:'DOCUMENTS RECOVERED'}];
 const result=assessMissionFilm([frame],events,0);
 assert.ok(result.issues.includes('extraction before objective'));
});
test('R5: empty events mean no confirmed contact or shot',()=>{
 const summary=summarizeMissionSamples([{seed:1,mission:'clear',
  topology:'a',invalid:false,objectiveDistance:200,
  verifiedApproaches:0,verifiedWindows:0,verifiedDoors:0,
  overexposedRooms:0,film:assessMissionFilm([],[])}]);
 assert.equal(summary.observedShots,0);
 assert.equal(summary.observedContacts,0);
 assert.equal(summary.completed,0);
});
