import test from 'node:test';import assert from 'node:assert/strict';
import {newSession,team} from '../src/breach-game.ts';
import {awarenessDebugLine} from '../src/breach-awareness-debug.ts';
test('debug summary is read-only and based solely on actor awareness',()=>{
 const a=team(newSession())[0],before=structuredClone(a.awareness);
 const display=awarenessDebugLine(a);
 assert.match(display,/INTENT/);
 assert.match(display,/LATEST/);
 assert.deepEqual(a.awareness,before);
});
