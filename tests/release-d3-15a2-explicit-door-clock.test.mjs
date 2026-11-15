import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveExplicitDoorActionClock}
 from '../src/breach-motor-door.ts';

test('D3.15A2: full explicit DOOR clock survives motor footwork',()=>{
 for(const method of ['open','kick','close','hold'])
   assert.equal(preserveExplicitDoorActionClock({kind:'door',method}),true,
     'authored '+method+' timer is not a disposable implicit OPEN timer');
});

test('D3.15A2: transient movement and idle implicit timers still reset',()=>{
 for(const kind of ['move','pie','wait','sync','look'])
   assert.equal(preserveExplicitDoorActionClock({kind}),false);
 assert.equal(preserveExplicitDoorActionClock(undefined),false);
 assert.equal(preserveExplicitDoorActionClock(null),false);
});
