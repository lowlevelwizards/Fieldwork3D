import test from 'node:test';
import assert from 'node:assert/strict';
import {headwearCuboidVolumes,HEAD_SILHOUETTE_METRICS} from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile,achMichHemY} from '../src/operator-ach-mich-details.ts';
test('H16 full cut has deep flared ear protection and an independent nape return',()=>{
 const ach=headwearCuboidVolumes('ach');
 const ear=ach.filter(v=>v.name.includes('ear-wrap'));
 assert.equal(ear.length,2);
 assert.ok(ear.every(v=>Math.abs(v.y-v.height/2-2.31)<1e-5));
 assert.ok(ear.every(v=>Math.abs(v.x)+v.width/2>5.3));
 assert.equal(HEAD_SILHOUETTE_METRICS.ach.earEdge,2.31);
 assert.ok(achMichHemY('ach',0)<2.4);
 assert.equal(achMichProfile('ach').hem[2][1],2.31);
 assert.ok(HEAD_SILHOUETTE_METRICS['high-cut'].earEdge>5.9);
 assert.equal(HEAD_SILHOUETTE_METRICS['mich-2001'].earEdge,5.91);
});
