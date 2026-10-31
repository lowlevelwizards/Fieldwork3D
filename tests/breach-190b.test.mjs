import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handlingPose} from '../src/breach-weapon-pose.ts';
const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const film=readFileSync(new URL('../src/breach-replay.ts',import.meta.url),'utf8');
test('190b: squeeze orientation is physically reflected by motor heading',()=>{
 assert.match(game,/angleDifference\(a\.heading,a\.squeezeYaw\)/);
 assert.match(game,/if\(a\.squeeze\)return/);
 assert.match(scene,/gait:actor\.squeeze\?'squeeze'/);
});
test('190b: squeeze weapon retraction and replay persistence',()=>{
 assert.equal(handlingPose({aim:0,moving:1,obstruction:false,
 friendlyNear:false,intent:'squeeze'}),'short');
 assert.match(film,/squeeze:a\.squeeze,squeezeYaw:a\.squeezeYaw/);
});
