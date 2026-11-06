import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {sampleReplayGhosts} from '../src/breach-replay-ghosts.ts';
test('ghosts use earlier immutable film frames without future information',()=>{
  const s=newSession(0),r=new MissionRecorder();
  const a=s.operators.find(x=>x.side==='blue');
  assert.ok(a);const first={...a.p};
  r.capture(s,true);
  s.seconds=1;a.p={x:first.x+10,y:first.y};r.capture(s);
  s.seconds=2;a.p={x:first.x+30,y:first.y};r.capture(s);
  const ghosts=sampleReplayGhosts(r,2,new Set([a.id]),[1,2]);
  assert.equal(ghosts.length,2);
  assert.equal(ghosts[0].p.x,first.x+10);
  assert.equal(ghosts[1].p.x,first.x);
  assert.equal(sampleReplayGhosts(r,.2,new Set([a.id])).length,0);
});
