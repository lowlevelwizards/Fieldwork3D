import test from 'node:test';
import assert from 'node:assert/strict';
import {ShadowUpdateController,shadowEligibleBox,stationaryShadowFingerprint}
  from '../src/rendering/breach-shadow-controller.ts';

test('active combat shadows never freeze, while identical paused scenes reuse map',()=>{
 const controller=new ShadowUpdateController();
 assert.equal(controller.shouldRefresh(true,''),true);
 assert.equal(controller.shouldRefresh(true,''),true);
 const state={site:3,phase:'planning',selected:'rook',focusX:23,focusY:47,
   objectRevision:1,known:12,intelMode:'floor-plan',lighting:'day',
   poseTime:0,simulationTime:1,actors:[{id:'rook',x:23,y:47,heading:0,posture:'stand',
     health:4,weaponYaw:0,recoil:0,reload:0,stride:0,weapon:'carbine'}],
   doors:[{id:'FRONT',fraction:0,open:false}]};
 let signature=stationaryShadowFingerprint(state);
 assert.equal(controller.shouldRefresh(false,signature),true);
 assert.equal(controller.shouldRefresh(false,signature),false);
 state.doors[0].fraction=.5;
 signature=stationaryShadowFingerprint(state);
 assert.equal(controller.shouldRefresh(false,signature),true,'a moving door invalidates shadow');
 state.actors[0].heading=.2;
 signature=stationaryShadowFingerprint(state);
 assert.equal(controller.shouldRefresh(false,signature),true,'changing aim invalidates shadow');
 assert.equal(controller.shouldRefresh(false,signature),false);
 controller.invalidate();
 assert.equal(controller.shouldRefresh(false,signature),true,'new site forces refresh');
 assert.ok(controller.reuses>=2);
});

test('shadow caster filter only excludes tiny details, not structural shapes',()=>{
 assert.equal(shadowEligibleBox(2,2,3),false);
 assert.equal(shadowEligibleBox(1,4,3),false);
 assert.equal(shadowEligibleBox(3,35,2),true);
 assert.equal(shadowEligibleBox(30,4,10),true);
 assert.equal(shadowEligibleBox(13,9,13),true);
});
