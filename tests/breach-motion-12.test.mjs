import test from 'node:test';
import assert from 'node:assert/strict';
import {createDistanceGait,advanceDistanceGait}
 from '../src/breach-distance-gait.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
test('crouch is a lower, broad, deterministic step with positive support',()=>{
 const s=createDistanceGait();let maxLift=0;
 for(let n=0;n<150;n++){
  const feet=advanceDistanceGait(s,{time:n/60,
   position:{x:n*19/60,y:0},rootYaw:0,facingYaw:0,
   travelYaw:0,speed:19,turning:0,posture:'crouch',
   injury:0,down:false,gait:'walk'});
  maxLift=Math.max(maxLift,...feet.map(f=>f.height));
  assert.ok(feet.some(f=>f.contact));
  assert.ok(feet.every(f=>Number.isFinite(f.position.x)));
 }
 assert.ok(maxLift>0&&maxLift<2.4);
 assert.ok(s.lastStanceWidth>=6);
});
test('crouch balanced pelvis stays inside anatomical bounds',()=>{
 const feet=[{position:{x:0,y:-6.2},height:0,phase:'planted',contact:true,worldYaw:0},
 {position:{x:0,y:6.2},height:0,phase:'planted',contact:true,worldYaw:0}];
 const out=bodyFromContacts({velocity:19,heading:0,travelYaw:0,
  turning:0,injury:0,posture:'crouch',feet,position:{x:0,y:0},
  hybridSupport:true});
 assert.ok(Number.isFinite(out.pelvisY));
 assert.ok(Math.abs(out.pelvisY)<4);
});
