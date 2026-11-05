import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES,factionReference} from '../src/faction-reference-catalog.ts';
import {auditFactionReferences} from '../src/faction-reference-audit.ts';
import {resolveFactionReference,referenceLookForKit} from '../src/faction-reference-resolver.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';

test('forty unique, dated, auditable faction visual references',()=>{
 const audit=auditFactionReferences();
 assert.equal(audit.referenceCount,40);
 assert.deepEqual(audit.issues,[]);
 assert.ok(audit.assetDemand.find(x=>x.id==='unit-insignia')?.referenceCount>=10);
 assert.equal(new Set(FACTION_REFERENCES.map(x=>x.id)).size,40);
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

test('new 9A–9B national camouflage families have dated usable references',()=>{
 const ids=['french-cce','swiss-taz90','south-korean-granite-b','indonesian-kopassus-flowing-blood'];
 for(const id of ids){
  const ref=FACTION_REFERENCES.find(x=>x.uniformCamo===id);
  assert.ok(ref,id);
  const kit=resolveFactionReference(ref);
  assert.equal(kit.wardrobe.fabricCamo?.top,id);
  assert.equal(kit.wardrobe.fabricCamo?.trousers,id);
 }
});
test('reference catalog spans multiple eras, regions and organizations',()=>{
 const years=FACTION_REFERENCES.map(x=>x.era.start);
 assert.ok(Math.min(...years)<1980);
 assert.ok(Math.max(...years)>=2022);
 assert.ok(new Set(FACTION_REFERENCES.map(x=>x.country)).size>=20);
 assert.ok(new Set(FACTION_REFERENCES.map(x=>x.organization)).size>=3);
});

test('all 40 reference kits apply cut-compatible independent equipment materials',()=>{
 for(const ref of FACTION_REFERENCES){
  const r=resolveFactionReference(ref),a=ref.gearAppearance;
  assert.ok(a,ref.id+' missing equipment profile');
  assert.ok(ref.gearFitNote,ref.id+' missing model-fit explanation');
  assert.deepEqual(r.incompatibleChannels,ref.id==='swiss-alpenflage-1980'?['trousers']:[],ref.id);
  assert.deepEqual(r.technicalIssues,[],ref.id);
  for(const [field,channel] of [
   ['armorCamo','armor'],['rigCamo','gear'],['packCamo','pack']
  ])if(a[field])
   assert.equal(r.wardrobe.fabricCamo?.[channel],a[field],ref.id+' '+field);
  if(a.headwearCamo)
   assert.equal(r.wardrobe.headwearCamo,a.headwearCamo,ref.id+' headwear');
  if(a.helmetCoverCamo)
   assert.equal(r.wardrobe.helmetCoverCamo,a.helmetCoverCamo,ref.id+' helmet cover');
 }
});
test('the right existing legacy armor and mismatched period webbing survive',()=>{
 const get=id=>resolveFactionReference(id);
 const russian=get('russian-emr-2015');
 assert.equal(russian.wardrobe.styles.armorStyle,'plate-legacy');
 assert.equal(russian.wardrobe.styles.rigStyle,'split-front');
 assert.equal(russian.wardrobe.fabricCamo?.armor,'russian-emr');
 const ocp=get('us-army-ocp-2019');
 assert.equal(ocp.wardrobe.styles.armorStyle,'plate-legacy');
 assert.equal(ocp.wardrobe.fabricCamo?.armor,'scorpion-w2');
 const usmc=get('usmc-desert-2010');
 assert.equal(usmc.wardrobe.fabricCamo?.pack,'woodland-marpat');
 assert.equal(usmc.wardrobe.fabricCamo?.armor,undefined);
 assert.equal(usmc.wardrobe.fabricSolids?.armor,'coyote');
 const m81=get('us-army-m81-1990');
 assert.equal(m81.wardrobe.styles.armorStyle,'soft-flak');
 assert.equal(m81.wardrobe.styles.rigStyle,'alice-lc2');
 assert.equal(m81.wardrobe.fabricCamo?.gear,undefined);
 const greek=get('greek-lizard-1990');
 assert.equal(greek.wardrobe.styles.headwear,'m1-steel');
 assert.equal(greek.wardrobe.helmetCoverCamo,'greek-lizard');
 const swiss=get('swiss-alpenflage-1980');
 assert.equal(swiss.kit.slots.rig,'rig-none');
 assert.equal(swiss.wardrobe.styles.rigStyle,'no-rig');
 const police=get('us-swat-2015');
 assert.equal(police.wardrobe.headwearCamo,undefined);
 assert.equal(police.wardrobe.fabricCamo?.gear,undefined);
});
