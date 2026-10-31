import test from 'node:test';
import assert from 'node:assert/strict';
import {createDistanceGait} from '../src/breach-distance-gait.ts';
import {supportZone} from '../src/breach-support-zone.ts';
import {decideHybridStep} from '../src/breach-hybrid-step-planner.ts';
const i={time:1,position:{x:0,y:0},rootYaw:0,facingYaw:0,
 travelYaw:0,speed:0,turning:0,posture:'stand',injury:0,
 down:false,gait:'walk'};
test('no phantom settle when feet support a stationary operator',()=>{
 const s=createDistanceGait();
 s.lastStepAt=.9;
 s.feet[0].plantedAt={x:0,y:-5.6};
 s.feet[1].plantedAt={x:0,y:5.6};
 assert.ok(supportZone(s.feet,i.position).offset<.01);
 assert.equal(decideHybridStep(s,i,0,0),null);
});
test('displaced weight requests a cooldown-limited corrective step',()=>{
 const s=createDistanceGait();
 s.lastStepAt=0;
 s.feet[0].plantedAt={x:4,y:-6};
 s.feet[1].plantedAt={x:4,y:6};
 assert.ok(supportZone(s.feet,i.position).offset>3.8);
 assert.equal(decideHybridStep(s,i,0,0)?.reason,'settle');
});
