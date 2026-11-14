import test from 'node:test';
import assert from 'node:assert/strict';
import {headwearCuboidVolumes,HEAD_SILHOUETTE_METRICS} from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,achMichHemY} from '../src/operator-ach-mich-details.ts';
test('H17 full cut has a single full-depth ear/nape silhouette',()=>{
 const ach=headwearCuboidVolumes('ach'),p=achMichProfile('ach');
 assert.equal(ach.length,5);
 assert.equal(ach.filter(v=>v.name.includes('ear-nape')).length,2);
 assert.ok(p.hem.every(v=>v[0]===p.side));
 assert.equal(HEAD_SILHOUETTE_METRICS.ach.earEdge,2.04);
 assert.equal(achMichHemY('ach',0),2.04);
 assert.equal(p.hem[2][1],2.04);
 assert.equal(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge,5.30);
});
