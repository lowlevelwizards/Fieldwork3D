import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {measureReplaySquadDoorEntry,featuredReplaySquadEntries}
  from '../src/breach-replay-squad-entry.ts';

const door={id:'FRONT',a:{x:0,y:-20},b:{x:0,y:20}};
const IDs=['rook','moss','ash','vale'];
const sample=(t,positions,health={})=>({
  t,doors:[door],actors:IDs.map((id,i)=>({
    id,health:health[id]??3,p:{x:positions[i],y:0}
  }))
});
test('entry gaps come exclusively from physical crossing samples',()=>{
  const film=[
    sample(0,[-30,-30,-30,-30]),
    sample(1,[-2,-25,-25,-25]),
    sample(1.25,[11,-25,-25,-25]),
    sample(2,[20,11,-23,-23]),
    sample(3,[20,20,10,-24]),
    sample(4,[20,20,20,11])
  ];
  const copy=structuredClone(film);
  const review=measureReplaySquadDoorEntry(film,'FRONT',IDs,0,4);
  assert.equal(review.approachSide,1);
  assert.deepEqual(review.crossings.map(c=>c.crossedAt),
    [1.25,2,3,4]);
  assert.deepEqual(review.crossings.map(c=>c.secondsAfterPrevious),
    [null,.75,1,1]);
  assert.equal(review.spreadSeconds,2.75);
  assert.equal(review.firstCrossingAt,1.25);
  assert.equal(review.lastCrossingAt,4);
  assert.deepEqual(film,copy,'read-only review must not alter mission film');
});
test('start or end window cannot read the future',()=>{
  const film=[sample(0,[-30,-30,-30,-30]),
    sample(1,[10,-30,-30,-30]),
    sample(2,[20,10,-30,-30])];
  const early=measureReplaySquadDoorEntry(film,'FRONT',IDs,0,1);
  assert.deepEqual(early.crossings.map(c=>c.crossedAt),[1,null,null,null]);
  assert.equal(early.spreadSeconds,null);
  assert.equal(early.sampledFrames,2);
  const later=measureReplaySquadDoorEntry(film,'FRONT',IDs,1,2);
  assert.equal(later.crossings[0].crossedAt,null);
  assert.equal(later.crossings[0].alreadyBeyond,true);
  assert.equal(later.crossings[1].crossedAt,2);
});
test('opposite starting sides and near-threshold jitter do not fabricate entry',()=>{
  const film=[sample(0,[-30,-30,30,30]),
    sample(.5,[3,-3,3,-3]),sample(1,[12,12,-12,-12])];
  const review=measureReplaySquadDoorEntry(film,'FRONT',IDs,0,1);
  assert.equal(review.approachSide,null);
  assert.equal(review.spreadSeconds,null);
  assert.ok(review.crossings.every(c=>c.crossedAt===null));
  const jitter=[sample(0,[-30,-30,-30,-30]),
    sample(.5,[2,-30,-30,-30]),
    sample(1,[-3,-30,-30,-30])];
  assert.equal(measureReplaySquadDoorEntry(jitter,'FRONT',IDs,0,1)
    .crossings[0].crossedAt,null);
});
test('downed actor transport is not a squad entry; missing inputs fail closed',()=>{
  const film=[sample(0,[-30,-30,-30,-30]),
    sample(1,[15,15,-30,-30],{moss:0})];
  const review=measureReplaySquadDoorEntry(film,'FRONT',IDs,0,1);
  assert.equal(review.crossings[0].crossedAt,1);
  assert.equal(review.crossings[1].crossedAt,null);
  assert.equal(measureReplaySquadDoorEntry(film,'OTHER',IDs,0,1),null);
  assert.equal(measureReplaySquadDoorEntry(film,'FRONT',IDs,2,3),null);
  assert.equal(measureReplaySquadDoorEntry(film,'FRONT',IDs,0,0),null);
});

test('featured entries rank actual recorded operator crossings, not unused doors',()=>{
  const film=[
    sample(0,[-30,-30,-30,-30]),
    sample(1,[11,-30,-30,-30]),
    sample(2,[11,12,-30,-30]),
    sample(3,[11,12,11,-30])
  ].map(frame=>({...frame,doors:[
    door,{id:'UNUSED',a:{x:250,y:-20},b:{x:250,y:20}}
  ]}));
  const ranked=featuredReplaySquadEntries(film,IDs,3,3);
  assert.deepEqual(ranked.map(r=>r.doorId),['FRONT']);
  assert.equal(ranked[0].crossings.filter(c=>c.crossedAt!==null).length,3);
  assert.deepEqual(featuredReplaySquadEntries(film,IDs,3,0),[]);
});
test('event drawer exposes a bounded operator-crossing review, not a HUD dock',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  assert.ok(html.includes('id="replaySquadEntryPanel"'));
  assert.ok(main.includes('featuredReplaySquadEntries('));
  assert.ok(main.includes('function renderReplaySquadEntries()'));
});
