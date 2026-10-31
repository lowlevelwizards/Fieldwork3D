import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('scenario-aware population stays deterministic, finite and reachable',()=>{
 for(let seed=1;seed<=100;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.enemies,b.enemies);
  assert.deepEqual(a.enemyHeadings,b.enemyHeadings);
  assert.equal(a.enemyHeadings?.length,a.enemies.length);
  assert.ok(a.enemyHeadings?.every(Number.isFinite));
  assert.ok(['routine','guarded','disrupted'].includes(a.scenarioStyle??''));
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
 }
});
