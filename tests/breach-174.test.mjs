import test from 'node:test';
import assert from 'node:assert/strict';
import {gaitBounds,advanceFootsteps,createFootstepScheduler}
 from '../src/breach-footsteps.ts';
import {LabMotionCache,LAB_TRACKS} from '../src/breach-lab-tracks.ts';
import {readFileSync} from 'node:fs';
const input=(gait,speed=43)=>({time:0,position:{x:0,y:0},
 rootYaw:0,travelYaw:0,facingYaw:0,speed,turning:0,
 posture:'stand',injury:0,down:false,gait});
test('174: running has own longer stride; pieing uses shorter deliberate steps',()=>{
 const walk=gaitBounds(input('walk'));
 const run=gaitBounds(input('run',78));
 const pie=gaitBounds(input('pie',8));
 assert.ok(run.preferredLead>walk.preferredLead);
 assert.ok(pie.preferredLead<walk.preferredLead);
 assert.ok(pie.swingDuration>walk.swingDuration);
 assert.ok(pie.landingDuration>walk.landingDuration);
 const side=gaitBounds({...input('walk',38),travelYaw:Math.PI/2});
 assert.ok(side.swingDuration>=.135,'strafe must preserve reachable shuffles');
});
test('174: running and pie gait remain deterministic in Lab and replayable',()=>{
 assert.ok(LAB_TRACKS.includes('run'));
 for(const name of ['walk','run','pie']){
  const cache=new LabMotionCache(name);
  const first=cache.sample(1.27).feet;
  cache.sample(3.1);cache.sample(.16);
  assert.deepEqual(cache.sample(1.27).feet,first);
 }
});
test('174: gameplay and replay convey gait intent to shared footstep scheduler',()=>{
 const game=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const replay=readFileSync(new URL('../src/breach-replay-motion.ts',import.meta.url),'utf8');
 assert.match(game,/actor\.pace==='run'/);
 assert.match(replay,/actor\.plan\[0\]\?\.kind==='pie'/);
 const s=createFootstepScheduler();
 for(let i=0;i<60;i++)
  advanceFootsteps(s,{...input('run',78),time:i/60,
    position:{x:i*1.3,y:0}});
 assert.equal(s.resets,1);
});
