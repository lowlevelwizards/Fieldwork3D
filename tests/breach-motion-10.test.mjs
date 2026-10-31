import test from 'node:test';
import assert from 'node:assert/strict';
import {hybridLanding} from '../src/breach-hybrid-landing.ts';
import {createDistanceGait,advanceDistanceGait}
 from '../src/breach-distance-gait.ts';
import {bootOutlineClearance,BOOT_CLEARANCE}
 from '../src/breach-gait-geometry.ts';
const input=(time,y,travelYaw=Math.PI/2)=>({
 time,position:{x:0,y},rootYaw:0,facingYaw:0,travelYaw,
 speed:34,turning:0,posture:'stand',injury:0,down:false,
 gait:'walk',footAllowed:()=>true
});
test('lateral landing respects actual rotated boot width',()=>{
 const s=createDistanceGait();
 advanceDistanceGait(s,input(0,0));
 const candidate=hybridLanding(input(.02,1),1,s.feet[0],s.feet[1]);
 assert.ok(candidate.valid);
 assert.ok(bootOutlineClearance(
   {position:s.feet[0].plantedAt,worldYaw:s.feet[0].worldYaw},
   {position:candidate.position,worldYaw:0})>=BOOT_CLEARANCE-.01);
});
test('sustained lateral steps never make both boots contact without clearance',()=>{
 const s=createDistanceGait();let close=Infinity,steps=0;
 for(let n=0;n<240;n++){
   const y=34*n/60;
   const feet=advanceDistanceGait(s,input(n/60,y));
   const gap=bootOutlineClearance(feet[0],feet[1]);
   close=Math.min(close,gap);
   assert.ok(gap>=-.03,'boot outlines collide at tick '+n+': '+gap);
   steps=s.stepsTaken;
 }
 assert.ok(steps>=3,'lateral gait stalled');
 assert.ok(close<15,'measurement exercised actual foot placement');
});
