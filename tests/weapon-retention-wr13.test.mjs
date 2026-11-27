import test from 'node:test';import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';
import {beginRetentionTick} from '../src/breach-weapon-retention-live.ts';
test('WR13 retention and ground custody rewind without leaking future state',()=>{
 const s=newSession(),a=team(s)[0],film=new MissionRecorder();
 film.capture(s,true);
 a.retentionTransition={mode:'side-slung',desired:'side-slung',weight:.6};
 a.groundedPrimaryId=99;a.primaryPlacement={order:1,kind:'placed',elapsed:0};
 s.seconds=.2;film.capture(s,true);
 assert.equal(film.frames.at(-1).actors.find(x=>x.id===a.id).groundedPrimaryId,99);
 applyReplayFrame(s,film.frames[0]);
 assert.equal(a.groundedPrimaryId,null);
 assert.equal(a.retentionTransition,undefined);
 applyReplayFrame(s,film.frames.at(-1));
 assert.equal(a.retentionTransition.weight,.6);
 a.health=0;beginRetentionTick(a,1/60);
 assert.equal(a.retentionTransition,undefined);
});
