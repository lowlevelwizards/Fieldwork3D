import test from 'node:test';
import assert from 'node:assert/strict';
import {selectColdMotorMicroDeparture}
 from '../src/breach-d326-micro-departure.ts';

const start={x:0,y:0},next={x:0,y:-20},goal={x:0,y:-40};
// The exact observed failure class: a coarse long chord may sample clear
// even though its real 0.3-unit initial motor step hits the wall.
const coarseMiss=(a,b)=>{
 const distance=Math.hypot(a.x-b.x,a.y-b.y);
 if(distance>4)return true;
 // A real northbound step near x=0 intersects the static wall.
 return !(b.y<-0.01&&a.x>-.9&&b.x>-.9);
};
const stand=()=>true;
const worldRoute=(stage,destination)=>[
 {x:stage.x,y:-20},{...destination}
];

test('D3.26C: actual micro-collision triggers one full-body verified 2/5-unit sidestep',()=>{
 assert.equal(coarseMiss(start,next),true,'long coarse chord falsely accepted');
 const corrected=selectColdMotorMicroDeparture(
  start,goal,next,coarseMiss,stand,worldRoute);
 assert.ok(corrected.length>=3,'cold verified recovery must exist');
 assert.ok(corrected[0].x<-.9,'physical departure backs out around wall');
 assert.deepEqual(corrected.at(-1),goal,'literal authored GO is unchanged');
 assert.ok(Math.hypot(corrected[0].x,corrected[0].y)<=5.01,
  'cannot teleport or pick a remote landing');
});

test('D3.26C: no new route for ordinary clear motor or fully blocked coarse route',()=>{
 assert.deepEqual(selectColdMotorMicroDeparture(start,goal,next,
  ()=>true,stand,worldRoute),[]);
 assert.deepEqual(selectColdMotorMicroDeparture(start,goal,next,
  ()=>false,stand,worldRoute),[]);
});

test('D3.26C: never cross unswept departure or approve substituted final GO',()=>{
 assert.deepEqual(selectColdMotorMicroDeparture(start,goal,next,
  coarseMiss,p=>p===start||p===goal,worldRoute),[]);
 assert.deepEqual(selectColdMotorMicroDeparture(start,goal,next,
  coarseMiss,stand,(stage)=>[{x:stage.x,y:-20},{x:55,y:-40}]),[]);
 assert.deepEqual(selectColdMotorMicroDeparture(start,goal,next,
  coarseMiss,stand,()=>[]),[]);
});
