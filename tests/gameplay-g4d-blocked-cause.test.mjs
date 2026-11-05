import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {blockedStepCause} from '../src/breach-nav-diagnostics.ts';
test('G4d: actually rejected movement cannot be reported clear',()=>{
 assert.equal(blockedStepCause('clear',false,false),'route');
 assert.equal(blockedStepCause('wall',false,false),'wall');
 assert.equal(blockedStepCause('furniture',false,false),'furniture');
 assert.equal(blockedStepCause('door',false,false),'door');
});
test('G4d: opposing body and closed leaf dominate contradictory observations',()=>{
 assert.equal(blockedStepCause('clear',true,false),'actor');
 assert.equal(blockedStepCause('clear',false,true),'door');
 assert.equal(blockedStepCause('wall',true,false),'actor');
});
test('G4d: actual motor uses the authoritative blocked step classification',()=>{
 const source=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.match(source,/a\.lastBlocker=blockedStepCause\(/);
 assert.match(source,/\.blocker,!!blocking,closed\)/);
});
