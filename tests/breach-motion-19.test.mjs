import test from 'node:test';
import assert from 'node:assert/strict';
import {idlePresence} from '../src/breach-idle-presence.ts';
const state={time:1.9,speed:0,aiming:false,firing:false,
 down:false,surrender:false,reload:false,posture:'stand'};
test('subtle idle micro-motion is deterministic and stable',()=>{
 const a=idlePresence(state);
 assert.deepEqual(idlePresence(state),a);
 assert.ok(Math.abs(a.breath)<.07);
 assert.ok(Math.abs(a.headYaw)<.015);
 assert.ok(Math.abs(a.weightShift)<.11);
});
test('idle is completely suppressed during aim, shooting, down and movement',()=>{
 for(const changes of [{aiming:true},{firing:true},{down:true},
   {surrender:true},{reload:true},{speed:20}]){
  const x=idlePresence({...state,...changes});
  assert.equal(x.strength,0);
  assert.ok(Math.abs(x.breath)<1e-12);
  assert.ok(Math.abs(x.weightShift)<1e-12);
 }
});
