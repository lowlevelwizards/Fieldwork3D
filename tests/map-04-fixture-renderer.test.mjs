import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('MAP 04 fixture shapes have one authoritative renderer path',()=>{
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const models=readFileSync(new URL('../src/worldgen/fixture-visuals.ts',import.meta.url),'utf8');
 assert.ok(scene.includes('renderFixtureVisual(intact,visual,i,localCtx,'));
 // One stable fixture renderer, now nested so destruction can replace the
 // intact silhouette with debris rather than miniaturizing that renderer.
 assert.equal((scene.match(/renderFixtureVisual\(intact,visual,i,localCtx,/g)??[]).length,1);
 assert.ok(scene.includes('this.coverVisualStates.set(i,{intact,debris})'));
 assert.ok(scene.includes('group.position.set(c.x,0,c.y)'));
 assert.ok(models.includes('export function renderFixtureVisual'));
 assert.ok(models.includes("fixture==='vehicle'")||models.includes("'sedan'"));
 assert.ok(!models.includes('this.box('));
 assert.ok(!models.includes('this.solid('));
});
