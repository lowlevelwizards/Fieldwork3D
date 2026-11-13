import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,team,planNearbyInteraction} from '../src/breach-game.ts';
import {coverTargetIndex} from '../src/worldgen/site-object-identity.ts';
test('C5: tap explicitly selects a different known physical prop instead of always nearest',()=>{
 const s=newSession(),a=team(s)[0];
 const at={...a.p};
 const nearest=s.coverState.length,farther=nearest+1;
 s.coverState.push(
  {id:'test-c5-near',x:at.x+13,y:at.y,w:14,h:14,fixture:'chair'},
  {id:'test-c5-target',x:at.x-19,y:at.y,w:14,h:14,fixture:'chair'});
 s.intel.cover.add(nearest);s.intel.cover.add(farther);
 assert.equal(planNearbyInteraction(s,a.id,'push',undefined,
   {x:at.x-19,y:at.y}),true);
 const node=a.plan.at(-1);
 assert.equal(node.objectId,'prop:test-c5-target');
 assert.equal(coverTargetIndex(s.coverState,'test-c5-target'),farther);
});
test('C5: unknown props cannot be implicitly revealed by a push tap',()=>{
 const s=newSession(),a=team(s)[0],at={...a.p};
 const index=s.coverState.length;
 s.coverState.push({id:'test-c5-secret',x:at.x+15,y:at.y,w:13,h:13,fixture:'chair'});
 const original=a.plan.length;
 // No new intel for this prop.
 const accepted=planNearbyInteraction(s,a.id,'push',undefined,
   {x:at.x+15,y:at.y});
 assert.notEqual(a.plan.at(-1)?.objectId,'prop:test-c5-secret');
 if(!accepted)assert.equal(a.plan.length,original);
 assert.equal(s.intel.cover.has(index),false);
});
test('C5: active prop push resolution is an order-local stable-ID cache',()=>{
 const src=readFileSync(new URL('../src/breach-order-interactions.ts',import.meta.url),'utf8');
 assert.match(src,/WeakMap<PlanNode/);
 assert.match(src,/coverTargetIndex\(s\.coverState,id\)/);
 const f=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.doesNotMatch(f.slice(f.indexOf('export function planNearbyInteraction('),
   f.indexOf('export function planCivilianInteraction(')),/\.sort\(/);
});
