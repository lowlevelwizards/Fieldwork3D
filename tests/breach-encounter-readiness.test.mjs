import test from 'node:test';
import assert from 'node:assert/strict';
import {encounterReactionDelay} from '../src/breach-encounter-readiness.ts';
test('reaction delay reflects preparedness and is deterministic',()=>{
 const id='guard4';
 assert.ok(encounterReactionDelay('relaxed',id)>
   encounterReactionDelay('prepared',id));
 assert.ok(encounterReactionDelay('attentive',id)>
   encounterReactionDelay('alerted',id));
 assert.equal(encounterReactionDelay('relaxed',id),
   encounterReactionDelay('relaxed',id));
});
