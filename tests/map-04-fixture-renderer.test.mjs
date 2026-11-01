import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('MAP 04 fixture shapes have one authoritative renderer path',()=>{
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const models=readFileSync(new URL('../src/worldgen/fixture-visuals.ts',import.meta.url),'utf8');
 assert.ok(scene.includes('renderFixtureVisual(group,visual,i,fixtureCtx,wood,steel,olive,metal)'));
 assert.ok(scene.includes('group.position.set(c.x,0,c.y)'));
 assert.ok(models.includes('export function renderFixtureVisual'));
 assert.ok(models.includes("fixture==='vehicle'")||models.includes("'sedan'"));
 assert.ok(!models.includes('this.box('));
 assert.ok(!models.includes('this.solid('));
});
