import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const capture=readFileSync(new URL('../scripts/capture-breach.mjs',import.meta.url),'utf8');
test('critical mobile captures use one reproducible real procedural site',()=>{
 assert.match(capture,/\?quick=1&seed=23/);
 assert.match(capture,/\?seed=23/);
 assert.match(capture,/Procedural battlefield startup failed/);
 assert.match(capture,/live\.setDefaultTimeout\(45000\)/);
});
test('manual NEW SITE still exercises actual varying procedural layouts',()=>{
 assert.match(capture,/await live\.locator\('#variant'\)\.click\(\)/);
 assert.match(capture,/secondSeed===beforeSeed/);
});
