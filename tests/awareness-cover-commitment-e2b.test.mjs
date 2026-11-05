import test from 'node:test';
import assert from 'node:assert/strict';
import {coverMoveDeadline,coverMoveCommitted}
 from '../src/breach-ai-position-commitment.ts';

test('E2-B: longer physical cover moves have sufficient bounded time',()=>{
 const short=coverMoveDeadline(2,18);
 const long=coverMoveDeadline(2,220);
 assert.ok(short>=5.2);
 assert.ok(long>short&&long<=11);
 assert.equal(coverMoveDeadline(2,220),long);
});
test('E2-B: committed cover moves finish before reconsideration',()=>{
 const until=coverMoveDeadline(2,120);
 assert.equal(coverMoveCommitted(true,80,3,until),true);
 assert.equal(coverMoveCommitted(true,7,3,until),false);
 assert.equal(coverMoveCommitted(true,80,until,until),false);
 assert.equal(coverMoveCommitted(false,80,3,until),false);
});
