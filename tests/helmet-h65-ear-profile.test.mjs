import test from 'node:test';
import assert from 'node:assert/strict';
import {headwearCuboidVolumes,HEAD_SILHOUETTE_METRICS} from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,achMichHemY} from '../src/operator-ach-mich-details.ts';
test('H6.5 ACH has one substantial ear drop and a smaller nape return',()=>{
 const ach=headwearCuboidVolumes('ach');
 const ear=ach.filter(v=>v.name.includes('ear-wrap'));
 assert.equal(ear.length,2);
 assert.ok(ear.every(v=>Math.abs(v.y-v.height/2-2.92)<1e-5));
 assert.equal(HEAD_SILHOUETTE_METRICS.ach.earEdge,2.92);
 assert.ok(achMichHemY('ach',0)<3.10);
 assert.equal(achMichProfile('ach').hem[2][1],2.92);
 assert.ok(HEAD_SILHOUETTE_METRICS['high-cut'].earEdge>5.9);
 assert.equal(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge,5.91);
});
