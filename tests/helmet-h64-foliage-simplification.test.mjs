import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readHelmetField,HELMET_FIELD_CONCEALMENT} from '../src/operator-helmet-field-policy.ts';
test('H6.4 only none/scrim/net/foliage are selectable',()=>{
 assert.deepEqual(HELMET_FIELD_CONCEALMENT,['none','scrim','net','foliage']);
 for(const old of ['foliage-loops','foliage-sparse','foliage-medium','foliage-heavy','foliage']){
  assert.equal(readHelmetField({concealment:old}).concealment,'foliage',old);
 }
 assert.equal(readHelmetField({concealment:'not-real'}).concealment,'none');
 const ui=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.ok(ui.includes("HELMET_FIELD_CONCEALMENT"));
 assert.ok(ui.includes("['none','scrim','net','foliage'].includes(id)"));
});
