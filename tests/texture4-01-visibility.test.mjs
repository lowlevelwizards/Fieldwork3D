import test from 'node:test';import assert from 'node:assert/strict';
import {summarizeWear} from '../src/worldgen/wear-diagnostics.ts';
import {generateSite} from '../src/breach-site.ts';
import {planEnvironmentalWear} from '../src/worldgen/environment-wear.ts';
test('wear diagnostics expose visibility without changing placement',()=>{
 const site=generateSite(126),marks=planEnvironmentalWear(site);
 const result=summarizeWear(marks);
 assert.deepEqual(result,summarizeWear(marks));
 assert.equal(result.markCount,marks.length);
 assert.ok(result.effectiveAlpha>=0&&result.effectiveAlpha<=1);
 assert.equal(summarizeWear([]).markCount,0);
});
