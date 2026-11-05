import test from 'node:test';
import assert from 'node:assert/strict';
import {factionReference} from '../src/faction-reference-catalog.ts';
import {resolveFactionReference} from '../src/faction-reference-resolver.ts';
import {referenceGapFidelity,unresolvedReferenceGaps} from '../src/faction-reference-asset-registry.ts';
import {auditFactionReferences} from '../src/faction-reference-audit.ts';
const detail=(id,gap)=>referenceGapFidelity(factionReference(id),
 factionReference(id).gaps.find(x=>x.id===gap));
test('R5I: M56 and M1956 are actually selected in date-matched references',()=>{
 assert.equal(detail('nva-strichtarn-1980','helmet-m56'),'exact');
 assert.equal(detail('us-army-erdl-1970','m1956-webbing'),'exact');
 const nva=resolveFactionReference('nva-strichtarn-1980');
 const erdl=resolveFactionReference('us-army-erdl-1970');
 assert.equal(nva.wardrobe.styles.headwear,'ddr-m56');
 assert.equal(nva.wardrobe.m56Details,'late-smooth');
 assert.equal(erdl.wardrobe.styles.rigStyle,'m1956-lce');
 assert.equal(erdl.wardrobe.m1956Variant,'late');
});
test('R5I: generic visor assets improve approximate police references without false exact coverage',()=>{
 for(const id of ['russian-omon-2002','us-swat-2015']){
  assert.equal(detail(id,'visor-police'),'approximate');
  assert.ok(unresolvedReferenceGaps(factionReference(id)).some(x=>x.id==='visor-police'));
  assert.equal(resolveFactionReference(id).wardrobe.styles.headwear,'police-helmet');
 }
});
test('R5I: all 40 historical recipes remain technically valid',()=>{
 const a=auditFactionReferences();
 assert.equal(a.referenceCount,40);
 assert.deepEqual(a.issues,[]);
 assert.equal(a.approximateAssets.filter(x=>x.assetId==='visor-police').length,2);
});
