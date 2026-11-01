import test from 'node:test';import assert from 'node:assert/strict';
import {newSession,movePhysicalProp} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame,MissionRecorder} from '../src/breach-replay.ts';
import {COVER} from '../src/breach-core.ts';
import {manipulateWindow} from '../src/breach-windows.ts';
test('mutable physical object states are reconstructed at replay timestamps',()=>{
 const s=newSession(),initial=snapshot(s);
 if(s.windows.length){
  assert.equal(manipulateWindow(s.windows[0],'break'),true);
  s.objectRevision++;
 }
 const index=s.coverState.findIndex(o=>o.fixture==='crate');
 if(index>=0)movePhysicalProp(s,index,{x:650,y:650});
 const changed=snapshot(s);
 applyReplayFrame(s,initial);
 assert.deepEqual(s.windows,initial.windows);
 assert.deepEqual(s.coverState,initial.coverState);
 assert.deepEqual(COVER,s.coverState);
 applyReplayFrame(s,changed);
 assert.deepEqual(s.windows,changed.windows);
 assert.deepEqual(s.coverState,changed.coverState);
});
test('unchanged object geometry shares snapshot arrays to bound mobile memory',()=>{
 const s=newSession(),recorder=new MissionRecorder();
 recorder.capture(s,true);
 s.seconds+=.06;recorder.capture(s);
 assert.strictEqual(recorder.frames[0].coverState,recorder.frames[1].coverState);
});
