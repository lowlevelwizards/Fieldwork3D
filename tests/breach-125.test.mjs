import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceFootsteps,createFootstepScheduler} from '../src/breach-footsteps.ts';
import {uncrossed,wrapAngle} from '../src/breach-locomotion.ts';
import {LabMotionCache} from '../src/breach-lab-tracks.ts';
const angle=(a,b)=>Math.abs(wrapAngle(b-a));
test('125: 180 degree pivot progresses through several bounded turns',()=>{
 const s=createFootstepScheduler();let lastYaw=0,maxJump=0,swings=0;
 for(let i=0;i<=360;i++){
  const t=i/60,target=-Math.PI*Math.min(1,Math.max(0,(t-.4)/1.3));
  const step=advanceFootsteps(s,{time:t,position:{x:0,y:0},
   rootYaw:target,facingYaw:-target,travelYaw:0,speed:0,
   turning:t<2?.8:0,posture:'stand',injury:0,down:false});
  maxJump=Math.max(maxJump,angle(lastYaw,s.pelvisYaw));
  if(step.some(f=>f.phase==='swinging'))swings++;
  assert.ok(uncrossed(step[0].position,step[1].position,
    -s.pelvisYaw,3.5),'legs crossed at '+t.toFixed(3));
  lastYaw=s.pelvisYaw;
 }
 assert.ok(maxJump<.09,'pelvis snapped instead of pivoting');
 assert.ok(swings>25,'needs deliberate foot repositioning');
 assert.ok(angle(lastYaw,-Math.PI)<.55,'turn did not reach target');
});
test('125: Lab pivot reconstructed at any timestamp independent of seek',()=>{
 const cache=new LabMotionCache('turn-180');
 const expected=cache.sample(1.64);
 for(const t of [3.2,.7,2.8,0,1.64])
  cache.sample(t);
 assert.deepEqual(cache.sample(1.64),expected);
});
