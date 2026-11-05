import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES,factionReference} from '../src/faction-reference-catalog.ts';
import {auditFactionReferences} from '../src/faction-reference-audit.ts';
import {resolveFactionReference,referenceLookForKit} from '../src/faction-reference-resolver.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';

test('twelve unique, dated, auditable faction visual references',()=>{
 const audit=auditFactionReferences();
 assert.equal(audit.referenceCount,12);
 assert.deepEqual(audit.issues,[]);
 assert.ok(audit.assetDemand.find(x=>x.id==='unit-insignia')?.referenceCount>=10);
 assert.equal(new Set(FACTION_REFERENCES.map(x=>x.id)).size,12);
});
test('every reference has a valid virtual kit and a resolved outfit',()=>{
 for(const ref of FACTION_REFERENCES){
  const r=resolveFactionReference(ref);
  assert.equal(r.reference.id,ref.id);
  assert.deepEqual(wardrobeConflicts(r.wardrobe,r.kit),[],ref.id);
  assert.ok(['rifle','carbine','smg','shotgun'].includes(r.kit.slots.primary.slice(8)));
  assert.equal(factionReference(ref.id),ref);
 }
});
test('reference view and use-look are appearance-only and preserve identity',()=>{
 const kit=initialEquipmentLoadout('smg');
 const snapshot=JSON.stringify(kit);
 const original=initialWardrobe();
 original.skinTone='tone-01';
 const chosen=referenceLookForKit('russian-emr-2015',kit,original);
 assert.equal(JSON.stringify(kit),snapshot);
 assert.notEqual(chosen.wardrobe,original);
 assert.ok(chosen.substituted.includes('armorStyle'));
 assert.ok(chosen.substituted.includes('rigStyle'));
 assert.equal(chosen.wardrobe.styles.armorStyle,undefined);
 assert.equal(chosen.wardrobe.fabricCamo?.top,'russian-emr');
});
test('Swiss patterned smock never mislabels an unsupported trouser cut',()=>{
 const r=resolveFactionReference('swiss-alpenflage-1980');
 assert.equal(r.wardrobe.fabricCamo?.top,'alpenflage');
 assert.notEqual(r.wardrobe.fabricCamo?.trousers,'alpenflage');
 assert.ok(r.incompatibleChannels.includes('trousers'));
});
