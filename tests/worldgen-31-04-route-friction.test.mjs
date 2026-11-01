import test from 'node:test';
import assert from 'node:assert/strict';
import {measureRouteFriction} from '../src/worldgen/route-friction.ts';
test('straight spacious travel has neither detour nor tightness warning',()=>{
 const r=measureRouteFriction({x:0,y:0},{x:100,y:0},
  [{x:100,y:0}],()=>true);
 assert.equal(r.detourRatio,1);
 assert.equal(r.narrowFraction,0);
 assert.deepEqual(r.warnings,[]);
});
test('deliberate severe detours and tight routes are warned, not rejected',()=>{
 const r=measureRouteFriction({x:0,y:0},{x:100,y:0},
  [{x:0,y:150},{x:100,y:150},{x:100,y:0}],()=>false);
 assert.equal(r.reachable,true);
 assert.ok(r.detourRatio>2.4);
 assert.ok(r.warnings.includes('excessive-detour'));
 assert.ok(r.warnings.includes('sustained-tightness'));
});
test('missing physical route is represented separately',()=>{
 const r=measureRouteFriction({x:0,y:0},{x:100,y:0},[],()=>true);
 assert.equal(r.reachable,false);
 assert.deepEqual(r.warnings,['unreachable']);
});
