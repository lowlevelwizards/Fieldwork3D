import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handlingPose} from '../src/breach-weapon-pose.ts';
const motor=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
test('190: squeeze is swept against rotated real body profile',()=>{
 assert.match(motor,/narrowAhead=sweptProfileClear/);
 assert.match(motor,/!a\.squeezing&&!normalAhead&&narrowAhead/);
 assert.match(motor,/a\.squeezing\?19:Infinity/);
 assert.match(motor,/if\(a\.squeezing\)\{a\.aim=/);
});
test('190: constrained weapon retracts',()=>{
 assert.equal(handlingPose({aim:0,moving:.5,obstruction:false,
   friendlyNear:false,intent:'squeeze'}),'short');
});
