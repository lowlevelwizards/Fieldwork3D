import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {captureReplayArchive,restoreReplayArchive,replayArchiveIsValid}
  from '../src/breach-replay-archive.ts';

test('complete replay restores frames, motion and permanent shot evidence',()=>{
 const s=newSession(0,1271),rec=new MissionRecorder();
 rec.capture(s,true);
 const actor=s.operators.find(a=>a.side==='blue');
 assert.ok(actor);
 const from={...actor.p};
 s.seconds=.05;actor.p={x:from.x+2,y:from.y};
 s.shots=[{id:1,shooterId:actor.id,targetId:null,side:'blue',
   start:{x:10,y:20},end:{x:55,y:35},age:0,hit:false,
   healthBefore:4,healthAfter:4,down:false}];
 rec.capture(s,true);
 const archive=captureReplayArchive(rec,'replay-test-001',1234);
 assert.equal(replayArchiveIsValid(archive),true);
 const restored=restoreReplayArchive(archive);
 assert.equal(restored.duration,rec.duration);
 assert.equal(restored.ballistics.shots[0].id,1);
 assert.deepEqual(restored.manifest.site.rooms,rec.manifest.site.rooms);
 assert.deepEqual(restored.sample(.025)?.actors.find(a=>a.id===actor.id)?.p,
   rec.sample(.025)?.actors.find(a=>a.id===actor.id)?.p);
 const originalFeet=rec.motion.presentation(.03,[actor.id]).feet[actor.id];
 const loadedFeet=restored.motion.presentation(.03,[actor.id]).feet[actor.id];
 assert.deepEqual(loadedFeet,originalFeet);
 restored.frames[0].actors[0].health=-1;
 assert.notEqual(rec.frames[0].actors[0].health,-1,
   'Restoring a recording must never mutate its source film');
});
test('corrupt and incompatible replay payloads are rejected',()=>{
 const s=newSession(0,17),r=new MissionRecorder();
 r.capture(s,true);s.seconds=.05;r.capture(s,true);
 const a=captureReplayArchive(r,'valid',123);
 assert.equal(replayArchiveIsValid({...a,schemaVersion:999}),false);
 assert.equal(replayArchiveIsValid({...a,frames:[a.frames[1],a.frames[0]]}),false);
 assert.equal(replayArchiveIsValid({...a,id:'../../file'}),false);
 assert.throws(()=>restoreReplayArchive({}),/Unsupported/);
});
