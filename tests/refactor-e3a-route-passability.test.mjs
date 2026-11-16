import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {memoizeExactRoutePassability}
 from '../src/breach-squeeze-route.ts';

test('E3.A: exact passability memo avoids duplicate world queries for same point and radius',()=>{
 let probes=0;
 const memo=memoizeExactRoutePassability((p,r)=>{
  probes++;
  return p.x>=10&&p.y>=0&&r<=12;
 });
 const p={x:10.25,y:2};
 assert.equal(memo(p,12),true);
 assert.equal(memo({x:10.25,y:2},12),true);
 assert.equal(probes,1,'identical exact points reuse a single sweep predicate');
 assert.equal(memo(p,14),false);
 assert.equal(memo(p,14),false);
 assert.equal(probes,2,'false results are cached, never confused with missing entries');
 assert.equal(memo({x:10.251,y:2},12),true);
 assert.equal(memo({x:10.25,y:2.01},12),true);
 assert.equal(probes,4,'sub-cell coordinate differences are authoritative');
 p.x=9;
 assert.equal(memo(p,12),false);
 assert.equal(probes,5,'mutable caller coordinates form a fresh exact key');
});
test('E3.A: each route invocation owns its cache, never retaining door or cover truth',()=>{
 let open=false;
 let probes=0;
 const predicate=()=>{probes++;return open;};
 const before=memoizeExactRoutePassability(predicate);
 assert.equal(before({x:12,y:12},12),false);
 open=true;
 assert.equal(before({x:12,y:12},12),false,
  'an in-flight snapshot remains stable inside one synchronous route');
 const after=memoizeExactRoutePassability(predicate);
 assert.equal(after({x:12,y:12},12),true,
  'a later route observes a newly opened door or moved cover');
 assert.equal(probes,2);
});
test('E3.A: motor routes share local predicate while retaining real swept-body checks',()=>{
 const src=readFileSync(new URL('../src/breach-squeeze-route.ts',import.meta.url),'utf8');
 const normal=src.slice(src.indexOf('export function routeWithNormalWorld'),
  src.indexOf('export function repairBlockedTransientWorldLeg'));
 const recovery=src.slice(src.indexOf('export function recoverNormalLane'),
  src.indexOf('export function routeWithSqueezeWorld'));
 const squeeze=src.slice(src.indexOf('export function routeWithSqueezeWorld'));
 assert.match(normal,/sharedCanStand\?\?memoizeExactRoutePassability\(/);
 assert.match(normal,/sweptProfileClear\(a,b,doors,0,'normal',world\)/);
 assert.match(recovery,/sharedCanStand=memoizeExactRoutePassability\(worldCanStand\(doors,world\)\)/);
 assert.match(recovery,/routeWithNormalWorld\(escape,to,doors,world,sharedCanStand\)/);
 assert.match(squeeze,/canStand=memoizeExactRoutePassability\(worldCanStand\(doors,world\)\)/);
 assert.match(squeeze,/sweptProfileClear\(previous,point,doors,heading,'squeeze',world\)/);
 const portal=src.slice(src.indexOf('export function routeToNextOperableDoor'),
  src.indexOf('export function recoverNormalLane'));
 assert.match(portal,/canStand=memoizeExactRoutePassability\(worldCanStand\(doors,world,true\)\)/);
 assert.match(portal,/sweptBodyClear\(previous,next,doors,OPERATOR_RADIUS,world\)/);
});
