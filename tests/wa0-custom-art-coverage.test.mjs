import test from 'node:test';
import assert from 'node:assert/strict';
import {collectCustomArtCases} from '../src/arsenal/wa0-custom-reference-cases.ts';
import {collectWeaponArtInventory} from '../scripts/audit-weapon-art-inventory.mjs';
test('non-factory artwork inventory is partitioned into accepted and unresolved cases',()=>{
 const source=collectWeaponArtInventory(),coverage=collectCustomArtCases();
 const ids=[...coverage.cases.map(c=>c.partId),...coverage.unresolved];
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(new Set(ids),new Set(source.parts.filter(p=>!p.appearsInFactory).map(p=>p.id)));
 for(const c of coverage.cases){
  const part=source.parts.find(p=>p.id===c.partId);
  assert.equal(c.config.build.parts[part.slot],c.partId);
 }
});
