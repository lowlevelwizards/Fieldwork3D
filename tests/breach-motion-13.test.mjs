import test from 'node:test';
import assert from 'node:assert/strict';
import {footArticulation} from '../src/breach-foot-articulation.ts';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
test('toe push-off rises and lands without discontinuity',()=>{
 const start=footArticulation('unloading',0);
 const end=footArticulation('unloading',1);
 assert.ok(end.pitch<start.pitch);
 assert.ok(end.rise>start.rise);
 assert.ok(Math.abs(end.pitch-footArticulation('swinging',0).pitch)<1e-8);
});
test('weight catch travels into body without oscillating at idle',()=>{
 const f=(phase,progress)=>({position:{x:0,y:5},
   height:0,contact:true,worldYaw:0,phase,progress});
 const req=(foot,velocity)=>({feet:[foot,f('planted',1)],
   velocity,heading:0,travelYaw:0,turning:0,injury:0,
   posture:'stand',position:{x:0,y:0}});
 const accepting=bodyFromContacts(req(f('landing',.5),35));
 const unloading=bodyFromContacts(req(f('unloading',.5),35));
 assert.ok(accepting.pelvisY<unloading.pelvisY);
 const idle=bodyFromContacts(req(f('planted',1),0));
 assert.equal(idle.chestLift,0);
});
