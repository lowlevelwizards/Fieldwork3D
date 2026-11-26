import test from 'node:test';
import assert from 'node:assert/strict';
import {collectWeaponArtInventory} from '../scripts/audit-weapon-art-inventory.mjs';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {WEAPON_ATTACHMENTS} from '../src/equipment-weapon-assemblies.ts';
import {SIDEARM_PREVIEW_REFERENCES} from '../src/weapons/geometry/sidearm-preview.ts';
import {SECONDARY_CAPACITY} from '../src/secondary-equipment.ts';

test('WA0 inventory covers all authoritative references, parts and attachments',()=>{
 const report=collectWeaponArtInventory();
 assert.deepEqual(report,collectWeaponArtInventory());
 assert.equal(report.totals.primary,ARSENAL_REFERENCES.length);
 assert.equal(report.totals.sidearms,SIDEARM_PREVIEW_REFERENCES.length);
 assert.equal(report.totals.authoredReferences,ARSENAL_REFERENCES.length+SIDEARM_PREVIEW_REFERENCES.length);
 assert.equal(report.totals.parts,Object.keys(FAMILY_PARTS).length);
 assert.equal(report.totals.attachments,Object.keys(WEAPON_ATTACHMENTS).length);
 assert.deepEqual(new Set(report.references.map(r=>r.id)),
  new Set([...ARSENAL_REFERENCES.map(r=>r.id),...SIDEARM_PREVIEW_REFERENCES.map(r=>r.id),'legacy-shotgun']));
 assert.equal(report.references.length,report.totals.authoredReferences+1);
 assert.equal(report.references.filter(r=>r.status==='fallback').length,1);
 for(const ref of report.references.filter(r=>r.status==='primary-reference'))
  for(const id of Object.values(ref.parts))
   assert.ok(report.parts.some(part=>part.id===id&&part.appearsInFactory));
});
test('WA0 distinguishes live issued sidearms from previews',()=>{
 const {references,totals}=collectWeaponArtInventory();
 assert.equal(totals.issuedSidearms,Object.keys(SECONDARY_CAPACITY).length);
 for(const ref of SIDEARM_PREVIEW_REFERENCES){
  const row=references.find(r=>r.id===ref.id);
  assert.equal(row.status,Object.hasOwn(SECONDARY_CAPACITY,ref.id)?
   'issued-sidearm-appearance':'preview-only');
 }
});
