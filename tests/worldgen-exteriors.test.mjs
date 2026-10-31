import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('exterior property zones are deterministic and traversable around actor spawns',()=>{
 for(let seed=1;seed<=75;seed++){
  const s=generateSite(seed);
  assert.ok(s.exteriorZones?.length>=1,'seed '+seed);
  assert.deepEqual(s.exteriorZones,generateSite(seed).exteriorZones);
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
 }
});
