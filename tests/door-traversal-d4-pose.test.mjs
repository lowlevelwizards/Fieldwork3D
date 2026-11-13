import test from 'node:test';
import assert from 'node:assert/strict';
import {doorGripWeight,DOOR_HAND_REACH_DURATION}
 from '../src/breach-pose-door-hand.ts';
import {DOOR_HAND_RELEASE_DURATION} from '../src/breach-door-hand-contact.ts';
const p={point:{x:10,y:20},mode:'handle',startedAt:2,releasedAt:null};
test('D4 deterministic reach and release is time-pure and has no state to reset',()=>{
 assert.equal(doorGripWeight(p,1),0);
 assert.equal(doorGripWeight(p,2),0);
 assert.ok(doorGripWeight(p,2+.08)>.1);
 assert.equal(doorGripWeight(p,2+DOOR_HAND_REACH_DURATION),1);
 const release={...p,releasedAt:2.5};
 assert.equal(doorGripWeight(release,2.5),1);
 assert.ok(doorGripWeight(release,2.5+.1)<1);
 assert.equal(doorGripWeight(release,2.5+DOOR_HAND_RELEASE_DURATION),0);
 assert.equal(doorGripWeight(release,2.9),0);
 assert.equal(doorGripWeight(p,2.3),1,'identical seek restores exact pose');
 assert.equal(doorGripWeight(null,2.3),0);
});
