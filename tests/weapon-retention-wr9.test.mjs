import test from 'node:test';import assert from 'node:assert/strict';
import {sampleSecondaryRetention} from '../src/breach-secondary-retention.ts';
test('WR9 rifle retention precedes the pistol draw and reverses on the same path',()=>{
 assert.deepEqual(sampleSecondaryRetention(0,true),{retention:0,pistol:0});
 assert.deepEqual(sampleSecondaryRetention(.45,true),{retention:1,pistol:0});
 assert.deepEqual(sampleSecondaryRetention(1,true),{retention:1,pistol:1});
 assert.equal(sampleSecondaryRetention(.2,true).pistol,0);
 assert.equal(sampleSecondaryRetention(.7,true).retention,1);
 assert.deepEqual(sampleSecondaryRetention(.7,false),{retention:0,pistol:.7});
});