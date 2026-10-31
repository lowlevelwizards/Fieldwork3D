import test from 'node:test';import assert from 'node:assert/strict';
import {advanceDistanceGait,createDistanceGait} from '../src/breach-distance-gait.ts';
const tick=(t,x)=>({time:t,position:{x,y:0},rootYaw:0,
 facingYaw:0,travelYaw:0,speed:44,turning:0,posture:'stand',
 injury:0,down:false,gait:'walk',footAllowed:()=>true});
test('five phases expose contact signal and toe pitch',()=>{
 const s=createDistanceGait(),phases=new Set(),pitches=[];
 for(let i=0;i<=240;i++){
  const feet=advanceDistanceGait(s,tick(i/60,i*44/60));
  for(const f of feet){phases.add(f.phase);pitches.push(f.pitch??0);}
  assert.ok(feet.some(f=>f.contact),'walk always has physical support');
 }
 for(const p of ['unloading','swinging','landing','recovering','planted'])
  assert.ok(phases.has(p),'missing '+p);
 assert.ok(pitches.some(p=>p<-.02)&&pitches.some(p=>p>.02));
});
test('airborne shoe is not repeatedly rescheduled',()=>{
 const s=createDistanceGait();let last=0;
 for(let i=0;i<=180;i++){
  advanceDistanceGait(s,tick(i/60,i*44/60));
  assert.ok(s.stepsTaken-last<=1);
  assert.ok(s.feet.filter(f=>f.phase==='swinging').length<=1);
  last=s.stepsTaken;
 }
});