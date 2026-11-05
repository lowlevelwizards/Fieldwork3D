import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {snapshot,MissionRecorder,applyReplayFrame}
 from '../src/breach-replay.ts';
import {assessOperation} from '../src/breach-operations.ts';
test('E5-B8 neutral locations and wounds are genuine replay samples',()=>{
 const s=newSession();
 const civ=createCivilian({id:'civ:test',role:'visitor',persona:'steady',
  activity:'idle',position:{x:60,y:80},heading:0,roomId:'a',
  appearanceSeed:11});
 s.civilians.push(civ);
 s.seconds=0;
 const recorder=new MissionRecorder();
 recorder.capture(s,true);
 civ.p={x:110,y:80};civ.heading=.75;civ.health=1;
 civ.state='wounded';civ.injuryStage=1;
 s.seconds=.1;
 recorder.capture(s,true);
 const sample=recorder.sample(.05);
 assert.ok(sample);
 assert.ok(sample.civilians[0].p.x>60&&sample.civilians[0].p.x<110);
 assert.equal(sample.civilians[0].state,'routine');
 applyReplayFrame(s,recorder.frames[0]);
 assert.deepEqual(s.civilians[0].p,{x:60,y:80});
 assert.equal(s.civilians[0].health,2);
 applyReplayFrame(s,recorder.frames[1]);
 assert.equal(s.civilians[0].health,1);
 assert.equal(s.civilians[0].state,'wounded');
});
test('E5-B8 older replay frames with no civilian data remain legal',()=>{
 const s=newSession(),f=snapshot(s);
 delete f.civilians;
 applyReplayFrame(s,f);
 assert.deepEqual(s.civilians,[]);
});
test('E5-B8 civilian injury penalizes scoring, never counts as enemy kill',()=>{
 const base={kind:'intel',outcome:'success',elapsed:95,
  casualties:0,teamSize:4,shots:5,hits:2,objective:true,extracted:4};
 const clean=assessOperation(base),harmed=assessOperation({
   ...base,civilianInjured:1,civilianDown:1
 });
 assert.ok(harmed.score<clean.score);
});
