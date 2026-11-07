import test from 'node:test';
import assert from 'node:assert/strict';
import {bodycamEligibleObserverIds,bodycamHasPersonalGround,
  bodycamDisclosureLabel,replayAudioListener,replayBodycamPan}
  from '../src/breach-replay-bodycam-controls.ts';

test('individual bodycam capability must have recorded observation key',()=>{
  const sample={
    visibleActorIds:['enemy'],visibleCivilianIds:[],discoveredBodyIds:[],
    operatorVisibleActorIds:{rook:[],moss:['enemy']}
  };
  assert.deepEqual(bodycamEligibleObserverIds(sample,['rook','ash','moss']),
    ['rook','moss']);
  assert.deepEqual(bodycamEligibleObserverIds({
    visibleActorIds:['enemy'],visibleCivilianIds:[],discoveredBodyIds:[]
  },['rook']),[]);
  assert.deepEqual(bodycamEligibleObserverIds(null,['rook']),[]);
});
test('Bodycam floor quality flags do not invent coarsely inferred tiles',()=>{
  const batches=[
    {at:0,observerId:'rook',keys:['0,0']},
    {at:.1,observerId:'moss',keys:['micro:3,4']},
    {at:.2,observerId:'rook',keys:['fine:1,2']}
  ];
  assert.equal(bodycamHasPersonalGround(batches,'rook'),true);
  assert.equal(bodycamHasPersonalGround(batches,'moss'),true);
  assert.equal(bodycamHasPersonalGround(batches,'ash'),false);
  assert.equal(bodycamHasPersonalGround(batches.slice(0,1),'rook'),false);
});
test('Bodycam disclosure always identifies reconstruction and shared geometry',()=>{
  for(const mount of ['chest','helmet']){
    const label=bodycamDisclosureLabel('rook',mount,false);
    assert.match(label,/RECONSTRUCTED BODYCAM/);
    assert.match(label,/SHARED ARCHITECTURE/);
    assert.match(label,/PERSONAL GROUND UNAVAILABLE/);
    assert.ok(label.includes(mount.toUpperCase()));
    assert.ok(bodycamDisclosureLabel('rook',mount,true).
      includes('PERSONAL CONTACTS'));
  }
});

test('Bodycam audio never substitutes a teammate or absent observer',()=>{
  const actors=[{id:'rook',p:{x:0,y:0},heading:0},
    {id:'moss',p:{x:100,y:100},heading:Math.PI/2}];
  assert.equal(replayAudioListener(actors,'rook','moss')?.id,'moss');
  assert.equal(replayAudioListener(actors,'rook',null)?.id,'rook');
  assert.equal(replayAudioListener(actors,'rook','missing'),null);
  assert.equal(replayAudioListener([], 'rook',null),null);
  assert.equal(replayAudioListener([
    {id:'rook',p:{x:NaN,y:0},heading:0}
  ],'rook',null),null);
});
test('Bodycam audio pans around historical facing, not global X',()=>{
  const east={id:'rook',p:{x:0,y:0},heading:0};
  assert.equal(replayBodycamPan({x:0,y:210},east),1);
  assert.equal(replayBodycamPan({x:0,y:-210},east),-1);
  assert.equal(replayBodycamPan({x:900,y:0},east),0);
  const south={...east,heading:Math.PI/2};
  assert.equal(replayBodycamPan({x:-420,y:0},south),1);
  assert.equal(replayBodycamPan({x:420,y:0},south),-1);
  assert.equal(replayBodycamPan({x:Infinity,y:0},east),0);
});
