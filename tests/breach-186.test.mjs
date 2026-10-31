import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayMotionRecorder} from '../src/breach-replay-motion.ts';
const actor=(x,y,t)=>({id:'a',p:{x,y},heading:0,velocity:20,
  turning:0,posture:'stand',pace:'walk',injuryStage:0,health:100,
  aim:0,plan:[],blockedTime:0,nav:[]});
test('186: replay travel yaw is historical, not latest/future direction',()=>{
  const rec=new ReplayMotionRecorder();
  rec.record(0,[actor(170,170)],[]);
  rec.record(1/60,[actor(171,170)],[]);
  rec.record(2/60,[actor(171,171)],[]);
  const a=rec.presentation(1/60,['a']).travelYaw.a;
  const b=rec.presentation(2/60,['a']).travelYaw.a;
  assert.ok(Math.abs(a)<.001);
  assert.ok(Math.abs(b-Math.PI/2)<.001);
  assert.deepEqual(rec.presentation(1/60,['a']).feet,
    rec.presentation(1/60,['a']).feet);
});
