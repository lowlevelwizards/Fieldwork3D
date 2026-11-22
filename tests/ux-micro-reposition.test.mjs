import test from 'node:test';
import assert from 'node:assert/strict';
import {holdHeadingForShortMove} from '../src/breach-order-movement.ts';

test('only genuine tiny corrections keep current facing until enough steps are taken',()=>{
 assert.equal(holdHeadingForShortMove(10,0,Math.PI),true);
 assert.equal(holdHeadingForShortMove(10,8,Math.PI),true);
 assert.equal(holdHeadingForShortMove(24,0,Math.PI),false,
  'long ordinary routes should use existing tactical facing and replay truth');
 assert.equal(holdHeadingForShortMove(10,18,Math.PI),false);
 assert.equal(holdHeadingForShortMove(10,0,.5),false);
});
