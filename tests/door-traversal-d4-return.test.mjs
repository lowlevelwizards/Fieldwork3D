import test from 'node:test';
import assert from 'node:assert/strict';
import {doorGripWeight}
 from '../src/breach-pose-door-hand.ts';
import {DOOR_HAND_RELEASE_DURATION,DOOR_HAND_REACH_DURATION}
 from '../src/breach-door-grip-constants.ts';
test('D4 deterministic animation reach and release with backward seek',()=>{
 const c={point:{x:15,y:12},mode:'handle',startedAt:2,releasedAt:null};
 assert.equal(doorGripWeight(null,3),0);
 assert.equal(doorGripWeight(c,1.9),0);
 assert.equal(doorGripWeight(c,2),0);
 assert.ok(doorGripWeight(c,2+.1)>.4);
 assert.equal(doorGripWeight(c,2+DOOR_HAND_REACH_DURATION),1);
 const released={...c,releasedAt:2.7};
 assert.equal(doorGripWeight(released,2.7),1);
 assert.ok(doorGripWeight(released,2.8)<1);
 assert.equal(doorGripWeight(released,2.7+DOOR_HAND_RELEASE_DURATION),0);
 assert.equal(doorGripWeight(c,2.4),1,'backwards replay seek is pure');
});
