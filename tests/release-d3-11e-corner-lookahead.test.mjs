import test from 'node:test';
import assert from 'node:assert/strict';
import {boundedMotorCornerLookahead}
 from '../src/breach-motor-cornering.ts';
const p=(x,y)=>({x,y});

test('D3.11E1: at most two shallow bends and two real body sweeps',()=>{
 const nav=[p(4,0),p(10,0),p(18,1),p(26,1)];
 const original=structuredClone(nav),checked=[];
 const skips=boundedMotorCornerLookahead(p(0,0),nav,true,(a,b)=>{
  checked.push([a,b]);return true;
 });
 assert.equal(skips,2,'no third skip even when the course remains shallow');
 assert.deepEqual(checked,[[p(0,0),p(10,0)],[p(0,0),p(18,1)]]);
 assert.deepEqual(nav,original,'authoritative motor owns disposable route mutations');
});
test('D3.11E1: blocked sweep retains the unsmoothed segment',()=>{
 const nav=[p(4,0),p(10,0),p(18,1)];
 let checks=0;
 assert.equal(boundedMotorCornerLookahead(p(0,0),nav,true,()=>{
  checks++;return checks===1;
 }),1);
 assert.equal(checks,2);
 assert.equal(boundedMotorCornerLookahead(p(0,0),nav,true,()=>false),0);
});
test('D3.11E1: reject door/queue/aim veto without even probing collision',()=>{
 let checks=0;
 assert.equal(boundedMotorCornerLookahead(p(0,0),
  [p(4,0),p(10,0)],false,()=>{checks++;return true;}),0);
 assert.equal(boundedMotorCornerLookahead(p(0,0),[p(4,0)],true,
  ()=>{checks++;return true;}),0);
 assert.equal(checks,0);
});
test('D3.11E1: sharp bends and long second chords are not shortcuts',()=>{
 let checks=0;
 assert.equal(boundedMotorCornerLookahead(p(0,0),
  [p(4,0),p(10,0),p(10,20)],true,
  ()=>{checks++;return true;}),1);
 assert.equal(checks,1,'sharp second bend rejects before collision');
 checks=0;
 assert.equal(boundedMotorCornerLookahead(p(0,0),
  [p(4,0),p(10,0),p(70,0)],true,
  ()=>{checks++;return true;}),1);
 assert.equal(checks,1,'a distant second chord never triggers a world sweep');
});
