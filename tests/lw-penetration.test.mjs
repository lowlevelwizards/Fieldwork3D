import test from 'node:test';import assert from 'node:assert/strict';
import {resolvePenetration} from '../src/breach-penetration.ts';
test('ray stops at first unpenetrable surface in sorted path',()=>{
 const hits=[{fraction:.8,material:'hardwood',thickness:1,coverIndex:3},
 {fraction:.1,material:'upholstery',thickness:1,coverIndex:2},
 {fraction:.5,material:'steel',thickness:2}];
 const p=resolvePenetration(hits,.55);
 assert.equal(p.stoppedAt,.5);assert.deepEqual(p.penetrated,[2]);
 assert.ok(p.remaining<.55);
});
test('low-energy projectile stops in thick wood while higher energy exits',()=>{
 const h=[{fraction:.3,material:'hardwood',thickness:3,coverIndex:1}];
 assert.equal(resolvePenetration(h,.1).stoppedAt,.3);
 assert.deepEqual(resolvePenetration(h,.6).penetrated,[1]);
 assert.equal(resolvePenetration(h,.6).stoppedAt,null);
});
