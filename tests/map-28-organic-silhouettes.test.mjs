import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/worldgen/fixture-visuals.ts',import.meta.url),'utf8');
test('trees have intentional branch grammar and reused canopy geometry',()=>{
 assert.ok(s.includes('FOLIAGE_LOBE_GEOMETRY'));
 assert.ok(s.includes('FOLIAGE_CONE_GEOMETRY'));
 assert.ok(s.includes('branch(c.x,trunkHeight*.72'));
 assert.ok(s.includes('branch(c.x,trunkHeight*.78'));
 assert.ok(s.includes('const scrub=fixture'));
 assert.ok(s.includes('const conifer=fixture'));
});