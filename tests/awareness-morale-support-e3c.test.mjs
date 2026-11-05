import test from 'node:test';
import assert from 'node:assert/strict';
import {moraleResponse} from '../src/breach-ai-morale.ts';
test('E3-C: isolation changes response to pressure without hiding injuries',()=>{
 const alone=moraleResponse(.16,.9,1,'guard',{nearbyAllies:0});
 const supported=moraleResponse(.16,.9,1,'guard',{nearbyAllies:2});
 assert.equal(alone,'surrender');
 assert.equal(supported,'withdraw');
});
test('E3-C: local support is bounded and prior four-argument calls remain stable',()=>{
 assert.equal(moraleResponse(.4,.5,1,'cautious'),'withdraw');
 assert.equal(moraleResponse(.4,.5,1,'cautious',{nearbyAllies:0}),'withdraw');
 assert.equal(moraleResponse(.4,.5,1,'cautious',{nearbyAllies:99}),
  moraleResponse(.4,.5,1,'cautious',{nearbyAllies:3}));
});
