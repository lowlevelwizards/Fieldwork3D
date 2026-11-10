import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('MAP 04 fixture shapes have one authoritative renderer path',()=>{
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 const builder=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
 const models=readFileSync(new URL('../src/worldgen/fixture-visuals.ts',import.meta.url),'utf8');
 assert.ok(builder.includes('renderFixtureVisual(intact,visual,i,localCtx,'));
 // One stable fixture renderer, now nested so destruction can replace the
 // intact silhouette with debris rather than miniaturizing that renderer.
 assert.equal((builder.match(/renderFixtureVisual\(intact,visual,i,localCtx,/g)??[]).length,1);
 assert.ok(builder.includes('host.coverVisualStates.set(i,{intact,debris})'));
 assert.ok(builder.includes('group.position.set(c.x,0,c.y)'));
 assert.doesNotMatch(scene,/renderFixtureVisual\(intact,visual/);
 assert.ok(models.includes('export function renderFixtureVisual'));
 assert.ok(models.includes("fixture==='vehicle'")||models.includes("'sedan'"));
 assert.ok(!models.includes('this.box('));
 assert.ok(!models.includes('this.solid('));
});
