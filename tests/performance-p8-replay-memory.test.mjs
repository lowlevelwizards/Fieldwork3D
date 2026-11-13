import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {snapshot} from '../src/breach-replay.ts';
import {shareUnchangedReplayFrame,REPLAY_FULL_KEYFRAME_INTERVAL}
 from '../src/breach-replay-sharing.ts';
test('unchanged civilian film frames share memory without changing historical evidence',()=>{
 const s=newSession(0,3411,'true-blind','small');
 const civilian=createCivilian({id:'p8',role:'resident',persona:'steady',
  activity:'idle',position:{x:120,y:80},heading:0,roomId:'a',appearanceSeed:6});
 s.civilians.push(civilian);
 const first=snapshot(s);
 const second=snapshot(s);
 const original=second.civilians.map(c=>structuredClone(c));
 shareUnchangedReplayFrame(first,second,1);
 assert.equal(second.civilians,first.civilians);
 assert.equal(second.civilianHarmEvents,first.civilianHarmEvents);
 assert.deepEqual(second.civilians,original);
 const keyframe=snapshot(s);
 shareUnchangedReplayFrame(second,keyframe,REPLAY_FULL_KEYFRAME_INTERVAL);
 assert.notEqual(keyframe.civilians,second.civilians);
 civilian.health=Math.max(0,civilian.health-1);
 const changed=snapshot(s);
 shareUnchangedReplayFrame(second,changed,REPLAY_FULL_KEYFRAME_INTERVAL+1);
 assert.notEqual(changed.civilians,second.civilians);
 assert.notDeepEqual(changed.civilians,second.civilians);
});
