import test from 'node:test';import assert from 'node:assert/strict';
import {moraleResponse,witnessShock} from '../src/breach-ai-morale.ts';
test('morale depends on injury, suppression and directly witnessed casualties',()=>{
 assert.equal(moraleResponse(.1,.8,1,'cautious'),'surrender');
 assert.equal(moraleResponse(1,.8,1,'guard'),'hold');
 assert.equal(moraleResponse(.4,.5,1,'cautious'),'withdraw');
 assert.equal(witnessShock(40,false),0);
 assert.equal(witnessShock(180,true),0);
 assert.ok(witnessShock(40,true)>0);
});
