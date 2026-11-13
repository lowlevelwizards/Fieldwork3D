import test from 'node:test';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES,factionReference} from '../src/faction-reference-catalog.ts';
import {auditFactionReferences} from '../src/faction-reference-audit.ts';
import {resolveFactionReference,referenceLookForKit} from '../src/faction-reference-resolver.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';
import {referenceGapFidelity} from '../src/faction-reference-asset-registry.ts';
import {identityMarking,referenceIdentity} from '../src/operator-identity-markings.ts';
import {markingBitmap} from '../src/operator-identity-marking-art.ts';
import {referenceWeaponChoice} from '../src/faction-reference-weapons.ts';

test('44 unique, dated, auditable faction visual references',()=>{
 const audit=auditFactionReferences();
 assert.equal(audit.referenceCount,44);
 assert.deepEqual(audit.issues,[]);
 assert.ok(audit.assetDemand.find(x=>x.id==='unit-insignia')?.referenceCount>=10);
 assert.equal(new Set(FACTION_REFERENCES.map(x=>x.id)).size,44);
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

test('all 44 reference kits apply cut-compatible independent equipment materials',()=>{
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

test('reversed US Army flag has a right-hand canton, with conservative historical default',()=>{
 const normal=markingBitmap('flag-us');
 const forward=markingBitmap('flag-us-reversed');
 assert.ok(normal&&forward);
 const pixel=(bitmap,x,y)=>Array.from(bitmap.pixels.slice((y*bitmap.width+x)*4,(y*bitmap.width+x)*4+3));
 assert.deepEqual(pixel(normal,1,1),pixel(forward,22,1));
 assert.notDeepEqual(pixel(normal,1,1),pixel(forward,1,1));
 assert.deepEqual(referenceIdentity('United States',2015,'military'),{rightShoulder:'flag-us-reversed'});
 assert.deepEqual(referenceIdentity('United States',1991,'military'),{});
 for(const id of ['us-army-ucp-2010','us-army-ocp-2019']){
  const ref=factionReference(id);
  assert.equal(ref.markings.rightShoulder,'flag-us-reversed');
  assert.equal(referenceGapFidelity(ref,ref.gaps.find(g=>g.id==='unit-insignia')),'approximate');
 }
});
test('OMON agency label is not an English POLICE panel',()=>{
 const ref=factionReference('russian-omon-2002');
 assert.equal(ref.markings.chest,'label-omon');
 assert.equal(identityMarking(ref.markings.chest)?.graphic,'omon');
 assert.ok(markingBitmap(ref.markings.chest));
 assert.equal(referenceGapFidelity(ref,{id:'police-marking'}),'exact');
});
test('current catalog uses available era-fitting weapons and modeled PASGT field dress',()=>{
 const canadian=referenceWeaponChoice('canada-cadpat-tw-2012');
 assert.equal(canadian.presetId,'ar-c7a2-proxy');
 assert.equal(canadian.preset.parts.stock,'ar-stock-m4');
 assert.equal(canadian.preset.parts.barrel,'ar-20-service');
 assert.equal(canadian.fidelity,'representative');
 assert.equal(referenceWeaponChoice('us-army-erdl-1970').presetId,'ar-car15');
 assert.equal(referenceWeaponChoice('russian-omon-2002').presetId,'ak-aks74u');
 const british=resolveFactionReference('british-dpm-1995');
 assert.equal(british.wardrobe.styles.headwear,'pasgt');
 assert.equal(british.wardrobe.pasgtDetails?.concealment,'scrim');
 const us=resolveFactionReference('us-army-m81-1990');
 assert.equal(us.wardrobe.pasgtDetails?.band,'elastic');
 assert.equal(us.wardrobe.pasgtDetails?.slits,true);
 for(const id of ['bundeswehr-flecktarn-2000','bundeswehr-tropentarn-2010']){
  const r=resolveFactionReference(id);
  assert.equal(r.wardrobe.markings?.leftShoulder,'flag-germany');
  assert.equal(r.wardrobe.markings?.rightShoulder,'flag-germany');
 }
});

test('historical field shirts now use available authentic short and solid cuts',()=>{
 const rhodesia=resolveFactionReference('rhodesian-brushstroke-1975');
 assert.equal(rhodesia.wardrobe.styles.top,'button-up-shirt');
 assert.equal(rhodesia.wardrobe.sleeveState,'short');
 assert.equal(rhodesia.wardrobe.fabricCamo?.top,'rhodesian-brushstroke');
 assert.equal(rhodesia.wardrobe.fabricCamo?.trousers,'rhodesian-brushstroke');
 assert.deepEqual(rhodesia.incompatibleChannels,[]);
 const sadf=resolveFactionReference('sadf-nutria-1985');
 assert.equal(sadf.wardrobe.styles.top,'button-up-shirt');
 assert.equal(sadf.wardrobe.fabricSolids?.top,'nutria-brown');
 assert.equal(sadf.wardrobe.fabricSolids?.trousers,'nutria-brown');
 assert.equal(sadf.wardrobe.styles.rigStyle,'sadf-webbing');
 assert.deepEqual(sadf.technicalIssues,[]);
});

test('four new dated references resolve mixed civilian and tactical dress',()=>{
 const ids=['private-security-iraq-2007','ukraine-territorial-2022',
  'us-police-polo-2020','us-swat-mp5-1995'];
 for(const id of ids){
  const ref=factionReference(id);
  assert.ok(ref);
  assert.ok(ref.sourceNotes.length>70);
  const resolved=resolveFactionReference(ref);
  assert.deepEqual(resolved.technicalIssues,[],id);
  assert.deepEqual(resolved.incompatibleChannels,[],id);
 }
 const iraq=resolveFactionReference(ids[0]);
 assert.equal(iraq.wardrobe.styles.top,'polo-shirt');
 assert.equal(iraq.wardrobe.fabricSolids?.top,'navy');
 assert.equal(iraq.wardrobe.fabricSolids?.trousers,'khaki');
 assert.equal(iraq.wardrobe.fabricSolids?.armor,'black');
 assert.equal(iraq.wardrobe.styles.headwear,'bare');
 const ukraine=resolveFactionReference(ids[1]);
 assert.equal(ukraine.wardrobe.styles.top,'button-up-shirt');
 assert.equal(ukraine.wardrobe.topColorway,'flannel-gray');
 assert.equal(ukraine.wardrobe.fabricCamo?.top,undefined);
 assert.equal(ukraine.wardrobe.fabricSolids?.trousers,'olive-drab');
 assert.equal(ukraine.kit.slots.armor,'armor-none');
 assert.equal(ukraine.wardrobe.styles.gloves,'gloves-none');
 const police=resolveFactionReference(ids[2]);
 assert.equal(police.wardrobe.styles.top,'polo-shirt');
 assert.equal(police.wardrobe.fabricSolids?.top,'navy');
 assert.equal(police.wardrobe.styles.rigStyle,'no-rig');
 assert.equal(police.wardrobe.markings?.chest,'label-police');
 const swat=resolveFactionReference(ids[3]);
 assert.equal(swat.wardrobe.styles.top,'bdu-shirt');
 assert.equal(swat.wardrobe.fabricSolids?.trousers,'navy');
 assert.equal(swat.wardrobe.gloveSolid,'black');
 assert.equal(swat.weapon.presetId,'hk-mp5a3');
 assert.notEqual(swat.weapon.fidelity,'proxy');
 const existing=resolveFactionReference('us-swat-2015');
 assert.equal(existing.weapon.presetId,'ar-m4a1');
 assert.equal(existing.wardrobe.gloveSolid,'black');
 assert.equal(resolveFactionReference('russian-omon-2002').wardrobe.gloveSolid,'black');
});

test('reference-specific colors and flannel survive appearance copying without inventory writes',()=>{
 const original=initialEquipmentLoadout('carbine');
 const snapshot=JSON.stringify(original);
 const before=initialWardrobe();
 before.skinTone='medium-neutral';
 const preview=referenceLookForKit('ukraine-territorial-2022',original,before);
 assert.equal(preview.resolved.wardrobe.topColorway,'flannel-gray');
 assert.equal(preview.wardrobe.topColorway,'flannel-gray');
 assert.equal(preview.wardrobe.fabricSolids?.trousers,'olive-drab');
 assert.equal(preview.wardrobe.skinTone,before.skinTone);
 assert.equal(JSON.stringify(original),snapshot);
 const police=referenceLookForKit('us-swat-mp5-1995',original,before);
 assert.equal(police.wardrobe.gloveSolid,'black');
});

test('invalid reference-only finishes report an actionable technical issue',()=>{
 const original=factionReference('us-police-polo-2020');
 const bogus={...original,topColorway:'flannel-blue',gloveSolid:'incorrect'};
 const result=resolveFactionReference(bogus);
 assert.ok(result.technicalIssues.some(x=>x.includes('Unavailable top finish')));
 assert.ok(result.technicalIssues.some(x=>x.includes('Unavailable glove solid')));
 assert.equal(result.wardrobe.topColorway,'standard');
});
