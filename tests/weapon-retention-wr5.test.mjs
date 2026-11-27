import test from 'node:test';import assert from 'node:assert/strict';
import {sampleSuspensionMotion} from '../src/breach-weapon-suspension.ts';
const m={stride:.23,speed:50,acceleration:45,turning:.8,massKg:3,inertia:150};
const length=x=>Math.hypot(x.roll,x.yaw,x.pitch);
test('WR5 deterministic and bounded suspension differentiates one and two points',()=>{
 const single=sampleSuspensionMotion('single',m),two=sampleSuspensionMotion('two',m);
 assert.deepEqual(single,sampleSuspensionMotion('single',m));
 // SR21 intentionally gives two-point slings more visible movement.
 assert.ok(length(single)>length(two)*2);
 assert.ok(length(two)>.025&&length(two)<.2);
 assert.ok(length(single)<.4);
 assert.equal(length(sampleSuspensionMotion('none',m)),0);
 assert.equal(length(sampleSuspensionMotion('two',{...m,speed:0,acceleration:0,turning:0})),0);
 assert.ok(length(sampleSuspensionMotion('single',{...m,massKg:6}))<length(single));
 assert.ok(Number.isFinite(length(sampleSuspensionMotion('single',{...m,stride:NaN,speed:Infinity}))));
});
