import test from 'node:test';
import assert from 'node:assert/strict';
import {shotPressureAtActor,shotPressureAmount}
 from '../src/breach-shot-pressure.ts';
const p=(x,y)=>({x,y});

test('A3: actual hits retain their previously established suppression',()=>{
 assert.equal(shotPressureAtActor(p(0,0),p(50,0),p(50,0),true,()=>false),'hit');
 assert.equal(shotPressureAmount('hit'),.31);
});

test('A3: physically near misses pressure the actor less than a hit',()=>{
 assert.equal(shotPressureAtActor(p(0,0),p(100,0),p(50,18),false,()=>true),'near');
 assert.equal(shotPressureAmount('near'),.16);
 assert.equal(shotPressureAtActor(p(0,0),p(100,0),p(50,40),false,()=>true),'none');
 assert.equal(shotPressureAmount('none'),0);
});

test('A3: occluded and truncated projectiles do not pass pressure through solid geometry',()=>{
 let consulted=false;
 const occluded=(a,b)=>{consulted=true;return false;};
 assert.equal(shotPressureAtActor(p(0,0),p(100,0),p(50,18),false,occluded),'none');
 assert.ok(consulted,'wall/door occlusion must be consulted for a physical near miss');
 assert.equal(shotPressureAtActor(p(0,0),p(20,0),p(80,0),false,()=>true),'none',
   'a round stopped by a surface cannot pressure a distant actor beyond its impact');
});

test('A3: invalid projectile geometry cannot fabricate danger',()=>{
 assert.equal(shotPressureAtActor(p(0,0),p(0,0),p(0,0),false,()=>true),'none');
 assert.equal(shotPressureAtActor(p(0,0),p(100,0),p(NaN,0),false,()=>true),'none');
 assert.equal(shotPressureAtActor(p(0,0),p(100,0),p(40,0),false,()=>true,-1),'none');
});
