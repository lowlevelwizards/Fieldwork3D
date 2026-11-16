import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {snapshot,MissionRecorder} from '../src/breach-replay.ts';

test('E5.2 the complete 12000-frame cap stops every archival writer',()=>{
 const s=newSession(0),rec=new MissionRecorder();
 rec.capture(s,true);
 const final=rec.frames[0];
 final.t=599.95;
 rec.frames.length=12000;
 rec.frames[11999]=final;
 const at=rec.duration;
 const initial={
  shots:rec.ballistics.shots.length,
  plans:rec.plans.revisions.length,
  doors:rec.doorKnowledge.observations.length,
  windows:rec.windowKnowledge.observations.length,
  motion:rec.motion.stepEventCount,
  events:rec.events.length,
  execution:rec.executionEvents.length,
  personal:rec.personalGround.length
 };
 // Changes after the terminal frame must not enter ANY archival stream.
 s.seconds=at+2;
 s.shots.push({id:8765,shooterId:'rook',start:{x:1,y:2},
  end:{x:30,y:40},age:.01,duration:1});
 s.operators[0].plan.push({kind:'move',p:{x:150,y:180}});
 if(s.doors.length)s.doors[0].open=!s.doors[0].open;
 rec.capturePlanning(s);
 for(let i=0;i<40;i++){
  s.seconds+=.051;
  rec.capture(s,i%2===0);
  rec.capturePlanning(s);
 }
 assert.equal(rec.frames.length,12000);
 assert.equal(rec.duration,at);
 assert.deepEqual({
  shots:rec.ballistics.shots.length,
  plans:rec.plans.revisions.length,
  doors:rec.doorKnowledge.observations.length,
  windows:rec.windowKnowledge.observations.length,
  motion:rec.motion.stepEventCount,
  events:rec.events.length,
  execution:rec.executionEvents.length,
  personal:rec.personalGround.length
 },initial,'no journal may retain evidence after the declared film cap');
 assert.deepEqual(rec.completeness,{
  complete:false,truncatedAt:at,reason:'memory frame limit'
 });
});
test('E5.2 before the cap live planning and ballistic evidence still record',()=>{
 const s=newSession(0),rec=new MissionRecorder();
 rec.capture(s,true);
 const initial=rec.plans.revisions.length;
 s.operators[0].plan.push({kind:'move',p:{x:222,y:333}});
 rec.capturePlanning(s);
 assert.ok(rec.plans.revisions.length>initial);
 s.shots.push({id:654,shooterId:s.operators[0].id,
  start:{x:1,y:2},end:{x:25,y:50},age:.1,duration:.3});
 rec.capture(s);
 assert.equal(rec.ballistics.shots.at(-1)?.id,654);
 assert.equal(rec.completeness.complete,true);
});
