import test from 'node:test';
import assert from 'node:assert/strict';
import {hybridLanding} from '../src/breach-hybrid-landing.ts';
import {createDistanceGait,advanceDistanceGait}
 from '../src/breach-distance-gait.ts';
import {horizontalLegReach} from '../src/breach-leg-geometry.ts';
const inp=(time,x,allowed=()=>true)=>({time,position:{x,y:0},
 rootYaw:0,facingYaw:0,travelYaw:0,speed:44,turning:0,
 posture:'stand',injury:0,down:false,gait:'walk',footAllowed:allowed});
test('landing forecast aims at future hip instead of old actor center',()=>{
 const s=createDistanceGait(),i=inp(0,0);
 advanceDistanceGait(s,i);
 const out=hybridLanding(i,0,s.feet[1],s.feet[0]);
 assert.ok(out.valid);
 assert.ok(out.futurePelvis.x>i.position.x+5);
 assert.ok(Math.hypot(out.position.x-out.futureHip.x,
   out.position.y-out.futureHip.y)<horizontalLegReach());
});
test('blocked footholds do not teleport through geometry',()=>{
 const s=createDistanceGait();
 for(let n=0;n<90;n++)
  advanceDistanceGait(s,inp(n/60,n*.7,()=>false));
 assert.equal(s.stepsTaken,0);
 assert.ok(s.starvations>0);
});