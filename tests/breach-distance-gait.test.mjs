import test from 'node:test';import assert from 'node:assert/strict';
import {createDistanceGait,advanceDistanceGait} from '../src/breach-distance-gait.ts';
const input=(t,x,gait='run')=>({time:t,position:{x,y:0},rootYaw:0,
 facingYaw:0,travelYaw:0,speed:78,turning:0,posture:'stand',
 injury:0,down:false,gait,footAllowed:()=>true});
test('distance gait actually cycles foot plants during extended run',()=>{
 const s=createDistanceGait();let moved=0,prev=-1;
 for(let i=0;i<360;i++){
  const feet=advanceDistanceGait(s,input(i/60,i*78/60));
  if(s.stepsTaken!==prev){moved++;prev=s.stepsTaken;}
  for(const f of feet)assert.ok(Number.isFinite(f.position.x));
 }
 assert.ok(s.stepsTaken>20,'must continue alternating during long run');
 assert.ok(moved>10);
 assert.equal(s.starvations,0);
});
test('no movement never invents a walking cycle',()=>{
 const s=createDistanceGait();
 for(let i=0;i<180;i++)advanceDistanceGait(s,input(i/60,0,'walk'));
 assert.equal(s.stepsTaken,0);
});
