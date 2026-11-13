import test from 'node:test';
import assert from 'node:assert/strict';
import {LabDistanceMotionCache} from '../src/breach-lab-tracks.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const tracks=['walk','run','accelerate','stop','back','strafe-left',
 'strafe-reverse','turn-90','pie','crouch-walk'];
test('A2.0: real recorded contact corpus is finite in every body channel',()=>{
 for(const track of tracks){
  const cache=new LabDistanceMotionCache(track);
  for(const time of [.2,.5,1,1.4,2,2.8,3.6]){
   const {motion:m,feet}=cache.sample(time);
   const input={velocity:m.speed,heading:m.heading,
    travelYaw:m.travelYaw,turning:m.turning,injury:m.injury,
    posture:m.posture,feet,position:{x:m.x,y:m.z},
    gait:track==='run'?'run':'walk'};
   const body=bodyFromContacts(input);
   assert.ok(Object.values(body).every(Number.isFinite),
    track+' at '+time+' returned nonfinite values');
   assert.deepEqual(body,bodyFromContacts(input),
    track+' at '+time+' did not replay deterministically');
   assert.ok(Math.abs(body.pelvisSide)<=2,'unbounded lateral motion');
   assert.ok(Math.abs(body.torsoSide)<=.15,'unbounded upper body tilt');
   assert.ok(Math.abs(body.headCounter)<=.10,'unbounded head counter');
  }
 }
});
test('A2.0: stationary symmetric stance does not invent lateral sway',()=>{
 const feet=[-1,1].map(side=>({position:{x:0,y:side*5.6},
  height:0,contact:true,worldYaw:0,phase:'planted',progress:1}));
 const input={velocity:0,heading:0,travelYaw:0,turning:0,injury:0,
  posture:'stand',feet,position:{x:0,y:0}};
 const result=bodyFromContacts(input);
 assert.equal(result.pelvisY,0);
 assert.equal(result.pelvisSide,0);
 assert.equal(result.torsoSide,0);
 assert.equal(result.support,0);
});
