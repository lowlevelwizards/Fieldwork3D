import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES,factionReference} from '../src/faction-reference-catalog.ts';
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
test('D7: police reference kits use existing black ballistic shells with an honest visor gap',()=>{
 for(const [id,shell] of [
  ['russian-omon-2002','pasgt'],
  ['us-swat-2015','mich-2001'],
  ['us-swat-mp5-1995','pasgt']
 ]){
  assert.equal(detail(id,'visor-police'),'missing');
  assert.ok(unresolvedReferenceGaps(factionReference(id)).some(x=>x.id==='visor-police'));
  const resolved=resolveFactionReference(id).wardrobe;
  assert.equal(resolved.styles.headwear,shell);
  assert.equal(resolved.headwearColor,'black');
 }
});
test('D7: all current historical recipes remain technically valid',()=>{
 const a=auditFactionReferences();
 assert.ok(a.referenceCount>=40);
 assert.equal(a.referenceCount,FACTION_REFERENCES.length);
 assert.deepEqual(a.issues,[]);
 assert.equal(a.approximateAssets.filter(x=>x.assetId==='visor-police').length,0);
});
