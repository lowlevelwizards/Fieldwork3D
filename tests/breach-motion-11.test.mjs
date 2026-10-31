import test from 'node:test';
import assert from 'node:assert/strict';
import {plannedBootYaw,angleDifference,BOOT_MAX_STEP_YAW}
 from '../src/breach-foot-yaw.ts';
import {createDistanceGait,advanceDistanceGait}
 from '../src/breach-distance-gait.ts';
test('bounded yaw uses shortest turn without 180-degree flips',()=>{
 for(const a of [-3.14,-1.8,0,1.8,3.14]){
   const next=plannedBootYaw(a,a+Math.PI);
   assert.ok(Math.abs(angleDifference(a,next))<=BOOT_MAX_STEP_YAW+1e-8);
 }
 assert.ok(Math.abs(angleDifference(
    plannedBootYaw(3.1,-3.1),-3.1))<.1);
});
test('stationary turn settles through successive real foot replants',()=>{
 const gait=createDistanceGait();let previous=[0,0],changes=0;
 for(let n=0;n<330;n++){
   const t=n/60,heading=Math.PI*Math.min(1,t/1.4);
   const feet=advanceDistanceGait(gait,{time:t,position:{x:0,y:0},
      rootYaw:-heading,facingYaw:heading,
      travelYaw:heading,speed:0,turning:n<85?Math.PI/1.4:0,
      posture:'stand',injury:0,down:false,gait:'walk'});
   for(let i=0;i<2;i++){
     if(n&&Math.abs(angleDifference(previous[i],gait.feet[i].worldYaw))>.01){
       assert.ok(Math.abs(angleDifference(previous[i],
         gait.feet[i].worldYaw))<=BOOT_MAX_STEP_YAW+.001);
       changes++;
     }
     previous[i]=gait.feet[i].worldYaw;
   }
   assert.ok(feet.every(f=>Number.isFinite(f.worldYaw)));
 }
 assert.ok(changes>=2,'feet were never replanted');
});
