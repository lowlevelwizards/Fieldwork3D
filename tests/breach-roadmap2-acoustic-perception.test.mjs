import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {newSession,enemies} from '../src/breach-game.ts';
import {scanEnemySoundEvidence} from '../src/breach-ai-acoustic-perception.ts';
test('enemy audio scans consume each identifier once without changing mission identity',()=>{
 try{
  const s=newSession(0,19,'full-view','small');
  const guard=enemies(s)[0];
  guard.lastNoiseExaminedId=0;
  guard.lastNoiseExaminedAt=-1;
  const origin={...guard.p};
  s.noise=[{id:101,p:{x:origin.x+4,y:origin.y+4},
   radius:250,time:s.seconds,kind:'door'}];
  scanEnemySoundEvidence(s,guard);
  assert.equal(guard.lastNoiseExaminedId,101);
  assert.equal(guard.lastNoiseExaminedAt,s.seconds);
  const after=guard.awareness.observations?.length;
  const repeat=scanEnemySoundEvidence(s,guard);
  assert.equal(repeat,null);
  if(after!==undefined)assert.equal(guard.awareness.observations.length,after);
  assert.deepEqual(guard.p,origin);
 }finally{activateSite(null);}
});
