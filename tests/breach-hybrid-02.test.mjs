import test from 'node:test';
import assert from 'node:assert/strict';
import {createDistanceGait,advanceDistanceGait} from '../src/breach-distance-gait.ts';
import {hybridStepThreshold} from '../src/breach-hybrid-step-planner.ts';
const tick=(time,x,mode='walk',v=44)=>({time,position:{x,y:0},rootYaw:0,
 facingYaw:0,travelYaw:0,speed:v,turning:0,posture:'stand',
 injury:0,down:false,gait:mode,footAllowed:()=>true});
test('deliberate forward gait schedules far fewer steps than frantic prototype',()=>{
 const state=createDistanceGait();let bothAir=0;
 for(let i=0;i<=180;i++){
  const f=advanceDistanceGait(state,tick(i/60,i*44/60));
  if(f.every(x=>!x.contact))bothAir++;
 }
 assert.ok(state.stepsTaken>5,'still advances when walking');
 assert.ok(state.stepsTaken<20,'does not take frantic short steps');
 assert.equal(bothAir,0,'always maintains a supporting foot');
});
test('no duplicate same-foot swing while previous foot is airborne',()=>{
 const s=createDistanceGait();
 for(let i=0;i<=240;i++){
  advanceDistanceGait(s,tick(i/60,i*78/60,'run',78));
  assert.ok(s.feet.filter(f=>f.phase==='swinging').length<=1);
 }
 assert.ok(hybridStepThreshold(tick(0,0,'run'))>
   hybridStepThreshold(tick(0,0,'walk')));
});