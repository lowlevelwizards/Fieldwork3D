import test from 'node:test';
import assert from 'node:assert/strict';
import {validPersistedReplayChunk,REPLAY_STREAM_MAX_CHUNKS}
  from '../src/breach-replay-chunk-store.ts';

const frames=[0,.05,.1].map(t=>({
  t,actors:[],doors:[],seenGround:[],knowledge:{
    visibleActorIds:[],visibleCivilianIds:[],discoveredBodyIds:[]
  }
}));
const boundary={
  index:0,first:0,endExclusive:3,fromTime:0,toTime:.1
};
test('G5c3 validates every persisted historical timestamp against catalog',()=>{
  assert.equal(REPLAY_STREAM_MAX_CHUNKS,5000);
  assert.equal(validPersistedReplayChunk(boundary,frames,-Infinity),true);
  assert.equal(validPersistedReplayChunk(boundary,frames.slice(1),-Infinity),false);
  assert.equal(validPersistedReplayChunk(boundary,frames,0),false);
  assert.equal(validPersistedReplayChunk(boundary,[frames[0],frames[1],
    {...frames[2],t:.05}],-Infinity),false);
  // Personal sight is intentionally optional in older V1 films.
  assert.equal(validPersistedReplayChunk(boundary,[frames[0],frames[1],
    {...frames[2],knowledge:undefined}],-Infinity),true);
  assert.equal(validPersistedReplayChunk(boundary,[frames[0],frames[1],
    {...frames[2],knowledge:null}],-Infinity),false);
  assert.equal(validPersistedReplayChunk({...boundary,
    fromTime:.01},frames,-Infinity),false);
  assert.equal(validPersistedReplayChunk({...boundary,
    endExclusive:4},frames,-Infinity),false);
});
