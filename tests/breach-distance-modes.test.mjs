import test from 'node:test';
import assert from 'node:assert/strict';
import {createDistanceGait,advanceDistanceGait}
  from '../src/breach-distance-gait.ts';
const run=(travelYaw,gait,stance=0)=>{
 const s=createDistanceGait();let x=0,y=0;
 for(let i=0;i<180;i++){
  x+=Math.cos(travelYaw)*.45;y+=Math.sin(travelYaw)*.45;
  const feet=advanceDistanceGait(s,{time:i/60,position:{x,y},
    rootYaw:0,facingYaw:0,travelYaw,speed:27,turning:0,
    posture:'stand',injury:0,down:false,gait,footAllowed:()=>true});
  assert.ok(feet.every(f=>Number.isFinite(f.position.x)&&
    Number.isFinite(f.position.y)));
 }
 return s;
};
test('strafe and reverse continue stepping rather than skating',()=>{
 assert.ok(run(Math.PI/2,'walk').stepsTaken>4);
 assert.ok(run(Math.PI,'walk').stepsTaken>4);
});
test('pie and squeeze continue deliberate bounded steps',()=>{
 assert.ok(run(.35,'pie').stepsTaken>5);
 const squeeze=run(Math.PI/2,'squeeze');
 assert.ok(squeeze.stepsTaken>5);
 assert.ok(squeeze.lastStanceWidth<3);
});
