import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fireLaneReachable,assessFireLane}
 from '../src/breach-fire-safety.ts';
const from={x:0,y:0},goal={x:90,y:0};
const lane=blocker=>({blocker});
const pass={end:{...goal},remaining:.18};
test('confirmed muzzle lanes allow genuinely penetrable cover',()=>{
 assert.equal(fireLaneReachable(lane('clear'),null,goal),true);
 assert.equal(fireLaneReachable(lane('cover'),pass,goal),true);
 assert.equal(fireLaneReachable(lane('cover'),{...pass,remaining:.015},goal),false);
 assert.equal(fireLaneReachable(lane('cover'),{...pass,
   end:{x:83,y:0}},goal),false);
 assert.equal(fireLaneReachable(lane('cover'),null,goal),false);
});
test('hard walls, shut leaves and friendlies cannot be bypassed by penetration',()=>{
 for(const reason of ['wall','door','friendly'])
   assert.equal(fireLaneReachable(lane(reason),pass,goal),false,reason);
});
test('friendly body still blocks the lane regardless of penetrable cover',()=>{
 const teammate={x:37,y:0};
 const actual=assessFireLane(from,26,goal,26,[],[],[],[teammate]);
 assert.equal(actual.blocker,'friendly');
 assert.equal(fireLaneReachable(actual,pass,goal),false);
});
test('simulation uses shared acquisition and ignition ballistic lane contract',()=>{
 const game=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const pipeline=readFileSync(new URL('../src/breach-firing-pipeline.ts',import.meta.url),'utf8');
 const resolution=readFileSync(new URL('../src/breach-shot-resolution.ts',import.meta.url),'utf8');
 assert.match(game,/runCombat\.fire\(s,a,h\)/);
 assert.match(pipeline,/return fireLaneReachable\(lane,preview,candidate\.p\)/);
 assert.match(resolution,/if\(!fireLaneReachable\(lane,laneTrace,target\.p\)\)/);
 assert.match(pipeline,/WEAPONS\[a\.weapon\]\.penetration/);
});
