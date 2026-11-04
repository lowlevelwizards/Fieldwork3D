import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {newSession,team,enemies,planMove,stepSession}
 from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {assessActiveTrial,summarizeActiveTrials}
 from '../src/breach-active-firefight-audit.ts';
import {activateSite,passable} from '../src/breach-core.ts';

test('R7D: actual authored orders run motor and record replay under live AI',()=>{
 try{
  const site=generateSite(13,'small',undefined,{mission:'clear'});
  const s=newSession(0,13,'floor-plan','small','clear',site);
  const a=team(s)[0];
  const accepted=Number(planMove(s,a.id,site.objective));
  const recorder=new MissionRecorder();
  recorder.capture(s,true);s.phase='running';s.started=true;
  for(let i=0;i<90&&s.phase==='running';i++){
   stepSession(s,1/30);recorder.capture(s);
  }
  const result=assessActiveTrial(13,'clear',accepted,
   recorder.frames,recorder.events);
  assert.ok(result.frameCount>=1);
  assert.ok(Number.isFinite(result.maxTravel));
  assert.ok(recorder.frames.every(f=>f.actors.every(actor=>
   Number.isFinite(actor.p.x)&&Number.isFinite(actor.p.y))));
  // Route failure is explicitly reported; an absent shot is NOT counted
  // as evidence of a successful firefight.
  assert.equal(result.shots,recorder.events.filter(e=>e.kind==='shot').length);
  assert.equal(result.firstContactAt===null,recorder.events.every(e=>
   !(e.kind==='intel'&&e.text.includes('SPOTTED'))));
 }finally{activateSite(null);}
});
test('R7D: never turn no-contact recordings into fake encounters',()=>{
 const summary=summarizeActiveTrials([{seed:1,mission:'clear',ordersAccepted:1,
  movedOperators:1,maxTravel:10,firstContactAt:null,firstShotAt:null,
  shots:0,wounded:0,downed:0,finished:false,frameCount:100,issues:[]}]);
 assert.deepEqual(summary.noContact,[1]);
 assert.equal(summary.contacts,0);
 assert.equal(summary.withShots,0);
});
