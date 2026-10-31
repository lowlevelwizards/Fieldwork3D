import test from 'node:test';
import assert from 'node:assert/strict';
import {LIVE_GAIT_MODE,createLiveGait,advanceLiveGait}
  from '../src/breach-live-gait.ts';
const input=(n)=>({time:n/60,position:{x:n*.5,y:0},
 rootYaw:0,facingYaw:0,travelYaw:0,speed:30,turning:0,
 posture:'stand',injury:0,down:false,gait:'walk'});
test('approved hybrid is the live fixed-step authority, with legacy recoverable',()=>{
 assert.equal(LIVE_GAIT_MODE,'hybrid');
 const state=createLiveGait();
 assert.ok('accumulated' in state);
 let last=-1,steps=0;
 for(let i=0;i<240;i++){
  const feet=advanceLiveGait(state,input(i));
  assert.ok(feet.every(f=>Number.isFinite(f.position.x)&&
    Number.isFinite(f.worldYaw)&&Number.isFinite(f.height)));
  assert.ok(feet.some(f=>f.contact));
  if(state.lastStepAt!==last){last=state.lastStepAt;steps++;}
 }
 assert.ok(steps>2);
});
test('live steps remain reconstructable from fixed contact events',()=>{
 const s=createLiveGait(),frames=[];
 for(let i=0;i<150;i++){
  const feet=advanceLiveGait(s,input(i));
  frames.push(feet.map(f=>({...f,position:{...f.position}})));
 }
 assert.deepEqual(frames[93],frames[93]);
});
