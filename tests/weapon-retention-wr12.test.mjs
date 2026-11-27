import test from 'node:test';import assert from 'node:assert/strict';
import {labRetentionSample} from '../src/operator-lab-retention.ts';
test('WR12 seekable retention audition rejects unsupported states',()=>{
 assert.equal(labRetentionSample('auto','sling-two-point',1,false,0),undefined);
 assert.equal(labRetentionSample('side-slung','sling-single-point',1,false,0),undefined);
 assert.equal(labRetentionSample('front-slung','sling-none',1,false,0),undefined);
 assert.equal(labRetentionSample('held-one','sling-none',.42,false,0).weight,.42);
 assert.equal(labRetentionSample('front-slung','sling-two-point',0,true,0).weight,0);
 assert.equal(labRetentionSample('front-slung','sling-two-point',0,true,1.5).weight,1);
 assert.equal(labRetentionSample('front-slung','sling-two-point',0,true,3).weight,0);
});
