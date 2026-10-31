import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('semantic furnishings are deterministic and preserve essential routes',()=>{
 for(let seed=1;seed<=65;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.cover,b.cover,'seed '+seed);
  const report=auditGeneratedSite(seed);
  assert.deepEqual(report.errors,[],'seed '+seed+': '+report.errors.join(', '));
 }
});
