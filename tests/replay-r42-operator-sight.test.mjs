import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {recordedObserverCanSee,recordedReplayKnowledge}
  from '../src/breach-replay-visibility.ts';
import {ReplayOperatorSightIndex}
  from '../src/breach-replay-operator-sight.ts';

const knowledge=(observed)=>({
  visibleActorIds:[],visibleCivilianIds:[],discoveredBodyIds:[],
  ...(observed?{operatorVisibleActorIds:observed}:{})
});
test('per-operator evidence is not confused with full-view team intel',()=>{
  const live=newSession(0);
  const [near,far]=live.operators.filter(a=>a.side==='blue');
  const hostile=live.operators.find(a=>a.side==='red');
  assert.ok(near&&far&&hostile);
  near.p={x:-1480,y:-1500};near.heading=0;
  far.p={x:-2300,y:-1500};far.heading=0;
  hostile.p={x:-1460,y:-1500};hostile.health=3;
  near.awareness.visualProgress[hostile.id]=1;
  far.awareness.visualProgress[hostile.id]=1;
  live.intel.mode='full-view';
  const frame=snapshot(live);
  assert.equal(frame.knowledge.visibleActorIds.includes(hostile.id),true);
  assert.equal(recordedObserverCanSee(frame.knowledge,near.id,hostile.id),true);
  assert.equal(recordedObserverCanSee(frame.knowledge,far.id,hostile.id),false);
  const playback=newSession(0);
  applyReplayFrame(playback,frame);
  assert.equal(recordedObserverCanSee(recordedReplayKnowledge(playback),
    near.id,hostile.id),true);
});
test('legacy films return unknown, never fabricated clear sight',()=>{
  assert.equal(recordedObserverCanSee(knowledge(null),'rook','guard'),null);
  assert.equal(recordedObserverCanSee(knowledge({rook:[]}),
    'rook','guard'),false);
  assert.equal(recordedObserverCanSee(knowledge({rook:['guard']}),
    'rook','guard'),true);
  assert.equal(recordedObserverCanSee(knowledge({rook:[]}),
    'moss','guard'),null);
});
test('sparse index uses initial-visible, acquired and lost without lookahead',()=>{
  const frames=[
    {t:0,knowledge:knowledge({rook:['a'],moss:[]})},
    {t:.05,knowledge:knowledge({rook:['a'],moss:['b']})},
    {t:.10,knowledge:knowledge({rook:[],moss:['b']})}
  ];
  const index=new ReplayOperatorSightIndex(frames);
  assert.equal(index.hasEvidence,true);
  assert.deepEqual(index.events.map(e=>[e.t,e.observerId,e.targetId,e.kind]),[
    [0,'rook','a','visible-at-start'],
    [.05,'moss','b','acquired'],
    [.10,'rook','a','lost']
  ]);
  assert.equal(index.forObserver('moss').length,1);
});
test('gaps never produce invented loss/reacquisition transitions',()=>{
  const frames=[
    {t:0,knowledge:knowledge({rook:['a']})},
    {t:.05,knowledge:knowledge(null)},
    {t:.10,knowledge:knowledge({rook:['a']})}
  ];
  const index=new ReplayOperatorSightIndex(frames);
  assert.deepEqual(index.events.map(e=>e.kind),
    ['visible-at-start','visible-at-start']);
  assert.equal(new ReplayOperatorSightIndex([
    {t:0,knowledge:knowledge(null)}
  ]).hasEvidence,false);
});
