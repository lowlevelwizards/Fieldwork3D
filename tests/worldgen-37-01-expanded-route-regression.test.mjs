import test from 'node:test';
import assert from 'node:assert/strict';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('extra archetype variety must never strand an operator or enemy in expanded garages',()=>{
 const audit=auditGeneratedSite(5,'expanded');
 assert.deepEqual(audit.errors,[],audit.errors.join(', '));
});
test('final encounter positions on expanded maps are reachable and deterministic',()=>{
 for(const seed of [5,16,27]){
  const a=auditGeneratedSite(seed,'expanded'),b=auditGeneratedSite(seed,'expanded');
  assert.deepEqual(a.errors.filter(x=>/enemy .*unreachable/.test(x)),[],seed+' '+a.errors.join(','));
  assert.deepEqual(a.encounterAudit,b.encounterAudit);
 }
});
