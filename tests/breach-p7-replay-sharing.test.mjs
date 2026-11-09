import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame,MissionRecorder} from '../src/breach-replay.ts';
import {REPLAY_FULL_KEYFRAME_INTERVAL,shareUnchangedReplayFrame}
  from '../src/breach-replay-sharing.ts';

test('identical complete replay frames share immutable actors, door and intel fields',()=>{
 const s=newSession(0),a=snapshot(s),b=snapshot(s);
 const stats={sharedActors:0,sharedFields:0,fullKeyframes:0};
 shareUnchangedReplayFrame(a,b,1,stats);
 assert.deepEqual(b,a);
 assert.strictEqual(b.actors[0],a.actors[0]);
 assert.strictEqual(b.doors,a.doors);
 assert.strictEqual(b.intel,a.intel);
 assert.strictEqual(b.known,a.known);
 assert.ok(stats.sharedActors>=s.operators.length);
 assert.ok(stats.sharedFields>=3);
});

test('any changed actor, door or knowledge value retains an independent snapshot',()=>{
 const s=newSession(0),a=snapshot(s);
 s.operators[0].p.x+=2;
 s.operators[0].health=Math.max(0,s.operators[0].health-1);
 s.doors[0].open=!s.doors[0].open;
 s.intel.doors.add('new-door-marker');
 const b=snapshot(s);
 shareUnchangedReplayFrame(a,b,2);
 assert.notStrictEqual(a.actors[0],b.actors[0]);
 assert.notStrictEqual(a.doors,b.doors);
 assert.notStrictEqual(a.intel,b.intel);
 const oldX=a.actors[0].p.x;
 b.actors[0].p.x+=5;
 assert.equal(a.actors[0].p.x,oldX,'mutating changed frames cannot alter prior history');
});

test('every 2-second keyframe is independently restorable',()=>{
 const s=newSession(0),a=snapshot(s),b=snapshot(s);
 const stats={sharedActors:0,sharedFields:0,fullKeyframes:0};
 shareUnchangedReplayFrame(a,b,REPLAY_FULL_KEYFRAME_INTERVAL,stats);
 assert.notStrictEqual(a.actors[0],b.actors[0]);
 assert.notStrictEqual(a.doors,b.doors);
 assert.equal(stats.fullKeyframes,1);
 assert.deepEqual(b,a);
});

test('20Hz recording retains random-access sample and replayed operator outcomes',()=>{
 const s=newSession(0),recorder=new MissionRecorder();
 recorder.capture(s,true);
 const firstX=s.operators[0].p.x;
 for(let i=1;i<=7;i++){
   s.seconds=i*.051;
   if(i===4)s.operators[0].p.x+=2;
   recorder.capture(s);
 }
 assert.ok(recorder.frames.length>=6);
 assert.ok(recorder.sharingStats.sharedActors>0,'idle actors share snapshots');
 const first=recorder.at(0),last=recorder.at(recorder.duration);
 assert.ok(first&&last);
 assert.equal(first.actors[0].p.x,firstX);
 assert.equal(last.actors[0].p.x,firstX+2);
 const play=newSession(0);
 applyReplayFrame(play,first);
 assert.equal(play.operators[0].p.x,firstX);
 applyReplayFrame(play,last);
 assert.equal(play.operators[0].p.x,firstX+2);
 const middle=recorder.sample(recorder.duration*.5);
 assert.ok(middle&&middle.actors.every(a=>Number.isFinite(a.heading)));
});

test('moving actors share stable nested state without merging different poses or authored changes',()=>{
 const s=newSession(0),prior=snapshot(s),actor=s.operators[0];
 actor.p.x+=1;
 const next=snapshot(s);
 shareUnchangedReplayFrame(prior,next,1);
 assert.notStrictEqual(next.actors[0],prior.actors[0]);
 for(const key of ['plan','spareMagazines','medical','medicalSupplies',
   'weaponConfiguration','skills','aimInstruction','watch','defense','traversal']){
   assert.strictEqual(next.actors[0][key],prior.actors[0][key],key);
 }
 // The live actor may now be edited, but must not mutate earlier film data.
 actor.plan.push({kind:'move',p:{x:100,y:110}});
 actor.skills={...actor.skills};
 const authored=snapshot(s);
 shareUnchangedReplayFrame(next,authored,2);
 assert.notStrictEqual(authored.actors[0].plan,next.actors[0].plan);
 assert.deepEqual(prior.actors[0].plan,[]);
 assert.deepEqual(next.actors[0].plan,[]);
 assert.strictEqual(authored.actors[0].skills,next.actors[0].skills);
 const keyframe=snapshot(s);
 shareUnchangedReplayFrame(authored,keyframe,REPLAY_FULL_KEYFRAME_INTERVAL);
 assert.notStrictEqual(keyframe.actors[0].plan,authored.actors[0].plan);
 assert.deepEqual(keyframe.actors[0],authored.actors[0]);
 const playback=newSession(0);
 applyReplayFrame(playback,authored);
 assert.equal(playback.operators[0].plan.length,1);
});
