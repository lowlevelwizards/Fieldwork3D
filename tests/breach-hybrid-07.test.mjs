import test from 'node:test';import assert from 'node:assert/strict';
import {LabHistoricalMotionCache,LabDistanceMotionCache}
 from '../src/breach-lab-tracks.ts';
import {measuredGaitQuality,hybridVisualPromotionGate}
 from '../src/breach-gait-acceptance.ts';
test('all lab snapshots sample deterministically regardless of seek order',()=>{
 for(const C of [LabHistoricalMotionCache,LabDistanceMotionCache]){
  for(const track of ['run','strafe-reverse','turn-180','pie','squeeze']){
   const c=new C(track),sample=c.sample(1.15);
   c.sample(3.1);c.sample(.43);
   assert.deepEqual(c.sample(1.15),sample);
  }
 }
});
test('quality score counts real touchdowns, not requests',()=>{
 const h=measuredGaitQuality('walk','hybrid');
 assert.ok(h.touchdowns>0);
 assert.equal(h.zeroSupportTicks,0);
 const old=measuredGaitQuality('walk','historical');
 assert.ok(old.touchdowns>0);
});
test('no visual promotion without physical on-device preference',()=>{
 assert.equal(hybridVisualPromotionGate([],true,false,true),false);
});