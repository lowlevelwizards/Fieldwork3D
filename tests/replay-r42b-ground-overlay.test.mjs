import test from 'node:test';
import assert from 'node:assert/strict';
import {paintReplayPersonalGround}
  from '../src/breach-replay-ground-overlay.ts';
function canvas(){
  const ops=[];
  const ctx={
    canvas:{width:0,height:0},
    save(){ops.push(['save']);},restore(){ops.push(['restore']);},
    setTransform(...args){ops.push(['transform',...args]);},
    clearRect(...args){ops.push(['clear',...args]);},
    beginPath(){ops.push(['begin']);},
    rect(...args){ops.push(['rect',...args]);},
    fill(){ops.push(['fill']);},
    set fillStyle(value){ops.push(['paint',value]);}
  };
  return {ctx,ops};
}
test('only fine and micro observed patches appear, not inferred coarse intel',()=>{
  const {ctx,ops}=canvas();
  const count=paintReplayPersonalGround(ctx,null,new Set([
    'fine:2,3','micro:6,7','4,5','garbage','micro:bad','fine:999999,3'
  ]));
  assert.equal(count,2);
  assert.deepEqual(ops.filter(x=>x[0]==='rect'),[
    ['rect',40,60,20,20],['rect',60,70,10,10]]);
  assert.equal(ops.filter(x=>x[0]==='fill').length,1);
});
test('empty observer evidence is transparent, never borrow squad sight',()=>{
  const {ctx,ops}=canvas();
  assert.equal(paintReplayPersonalGround(ctx,null,new Set()),0);
  assert.equal(ops.filter(x=>x[0]==='fill').length,0);
  assert.equal(ops.filter(x=>x[0]==='clear').length,1);
});
test('two observers at same time render different exact footprints',()=>{
  const rook=canvas(),moss=canvas();
  paintReplayPersonalGround(rook.ctx,null,new Set(['micro:1,1']));
  paintReplayPersonalGround(moss.ctx,null,new Set(['micro:12,10']));
  assert.deepEqual(rook.ops.find(x=>x[0]==='rect'),['rect',10,10,10,10]);
  assert.deepEqual(moss.ops.find(x=>x[0]==='rect'),['rect',120,100,10,10]);
});
