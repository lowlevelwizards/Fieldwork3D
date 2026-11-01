import test from 'node:test';
import assert from 'node:assert/strict';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('extra archetype variety must never strand an operator or enemy in expanded garages',()=>{
 const audit=auditGeneratedSite(5,'expanded');
 assert.deepEqual(audit.errors,[],audit.errors.join(', '));
});
