import test from 'node:test';
import assert from 'node:assert/strict';
import {footArticulation} from '../src/breach-foot-articulation.ts';
import {createFootstepScheduler,advanceFootsteps}
 from '../src/breach-footsteps.ts';
import {LabMotionCache} from '../src/breach-lab-tracks.ts';
const input=(t,x,speed)=>({time:t,position:{x,y:0},
 rootYaw:0,facingYaw:0,travelYaw:0,speed,turning:0,
 posture:'stand',injury:0,down:false});
test('127: heel-toe roll is bounded and grounded in phase',()=>{
 assert.ok(footArticulation('unloading',1).pitch<-.15);
 assert.ok(footArticulation('landing',0).pitch>.15);
 assert.equal(footArticulation('planted',.5).pitch,0);
 for(const phase of ['planted','unloading','swinging','landing',
  'recovering'])
  for(let i=0;i<=100;i++){
   const {pitch,rise}=footArticulation(phase,i/100);
   assert.ok(Math.abs(pitch)<.21);
   assert.ok(rise>=0&&rise<=1.01);
  }
});
test('127: a committed step keeps phase durations through a stop',()=>{
 const s=createFootstepScheduler();
 advanceFootsteps(s,input(0,0,36));
 advanceFootsteps(s,input(.10,3.6,36));
 let foot=s.feet.find(x=>x.phase==='unloading');
 assert.ok(foot,'first step should unload');
 const original=foot.swingDuration,landing=foot.landingDuration;
 for(let i=7;i<=70;i++)
  advanceFootsteps(s,input(i/60,3.6,0));
 assert.equal(foot.swingDuration,original);
 assert.equal(foot.landingDuration,landing);
});
test('127: frame seek returns identical shoe pitch, lift and contact',()=>{
 for(const kind of ['walk','strafe-left','strafe-right','turn-180']){
  const cache=new LabMotionCache(kind),time=1.371;
  const expected=cache.sample(time).feet;
  for(const t of [0,2.6,3.8,.3,time])cache.sample(t);
  assert.deepEqual(cache.sample(time).feet,expected);
  for(const foot of expected){
   assert.ok(Number.isFinite(foot.pitch));
   assert.ok(Number.isFinite(foot.height));
  }
 }
});
test('127: swing lift peaks mid-step, remains zero at both ends',()=>{
 const a=footArticulation('swinging',0),b=footArticulation('swinging',.5),
  c=footArticulation('swinging',1);
 assert.ok(Math.abs(a.rise)<1e-9);
 assert.ok(b.rise>.99);
 assert.ok(Math.abs(c.rise)<1e-9);
});
