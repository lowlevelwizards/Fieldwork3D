import test from 'node:test';import assert from 'node:assert/strict';
import {createDistanceGait,advanceDistanceGait}
  from '../src/breach-distance-gait.ts';
const make=(t,x,y=0,yaw=0,gait='walk')=>({time:t,
 position:{x,y},rootYaw:-yaw,facingYaw:yaw,travelYaw:0,
 speed:x===0?0:50,turning:0,posture:'stand',injury:0,
 down:false,gait,footAllowed:()=>true});
test('distance-based stance cycle completes during travel',()=>{
 const s=createDistanceGait();
 for(let i=0;i<120;i++)advanceDistanceGait(s,make(i/60,i*.7));
 assert.ok(s.stepsTaken>=7);
 assert.equal(s.starvations,0);
});
test('stationary turn requests alternating corrective steps',()=>{
 const s=createDistanceGait();
 for(let i=0;i<=120;i++){
  const yaw=Math.PI*i/120;
  advanceDistanceGait(s,make(i/60,0,0,yaw));
 }
 assert.ok(s.stepsTaken>=2,'180 degree pivot requires steps');
});
