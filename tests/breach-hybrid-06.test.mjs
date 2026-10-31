import test from 'node:test';import assert from 'node:assert/strict';
import {LabDistanceMotionCache} from '../src/breach-lab-tracks.ts';
test('strafe-left leads with left foot, then follows',()=>{
 const c=new LabDistanceMotionCache('strafe-left'),steps=[];
 let n=0;
 for(const s of c.frames)
  if(s.stepsTaken>n){steps.push(s.lastStepFoot);n=s.stepsTaken;}
 assert.ok(steps.length>2);
 assert.equal(steps[0],0);
 assert.ok(steps.slice(1).some((foot,i)=>foot!==steps[i]));
});
test('pie, pivot and squeeze use bounded purposeful cadence',()=>{
 for(const mode of ['pie','turn-180','squeeze']){
  const c=new LabDistanceMotionCache(mode),s=c.frames.at(-1);
  assert.ok(s.stepsTaken>0,'no steps in '+mode);
  assert.ok(s.stepsTaken<19,'frantic steps in '+mode);
  assert.ok(s.feet.every(f=>Number.isFinite(f.plantedAt.x)));
 }
});