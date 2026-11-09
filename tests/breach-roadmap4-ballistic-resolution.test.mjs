import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {segmentImpact,strikeSurface} from '../src/breach-ballistic-resolution.ts';
test('ballistic segment intersection is bounded and symmetric to path extension',()=>{
 assert.equal(segmentImpact({x:0,y:0},{x:10,y:0},
  {a:{x:4,y:-5},b:{x:4,y:5}}),.4);
 assert.equal(segmentImpact({x:0,y:3},{x:10,y:3},
  {a:{x:4,y:4},b:{x:4,y:9}}),null);
});
test('ballistic trace is pure and does not consume ammunition or geometry',()=>{
 const s=newSession(),a=s.operators[0];
 const shots=a.shots,rounds=a.magazine,revision=s.objectRevision;
 const ray=strikeSurface(a.p,{x:a.p.x+15,y:a.p.y},s,22,22,0);
 assert.ok(Number.isFinite(ray.end.x)&&Number.isFinite(ray.end.y));
 assert.equal(a.shots,shots);assert.equal(a.magazine,rounds);
 assert.equal(s.objectRevision,revision);
});
