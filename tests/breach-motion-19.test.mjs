import test from 'node:test';
import assert from 'node:assert/strict';
import {bodyFromContacts} from '../src/breach-body-motion.ts';
const feet=[-1,1].map(sign=>({position:{x:0,y:sign*5.6},
 height:0,contact:true,worldYaw:0,phase:'planted',progress:1}));
const evaluate=(seconds,velocity=0,tacticalTension=0)=>
 bodyFromContacts({feet,velocity,heading:0,travelYaw:0,turning:0,
 injury:0,posture:'stand',seconds,tacticalTension});
test('idle breath is subtle, deterministic and naturally suppressed by action',()=>{
 const initial=evaluate(.73);
 assert.equal(initial.breath,evaluate(.73).breath);
 assert.ok(Math.abs(initial.breath)<.12);
 assert.equal(evaluate(.73,48).breath,0);
 assert.equal(evaluate(.73,0,1).breath,0);
});
