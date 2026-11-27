import test from 'node:test';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {clearLiveUnifiedCarry} from '../src/operator-unified-carry-live.ts';
import {quoteUnifiedLoadout} from '../src/equipment-unified-loadout.ts';
import {waistPlacementsConflict} from '../src/equipment-fixed-carrier-slots.ts';
import {referencePackStudies,referenceSidearmStudyAvailable,resolveReferencePreview} from '../src/faction-reference-preview-options.ts';
import {canonicalPackEquipment} from '../src/operator-backpack-catalog.ts';
import assert from 'node:assert/strict';
import {FACTION_REFERENCES,factionReference} from '../src/faction-reference-catalog.ts';
import {auditFactionReferences} from '../src/faction-reference-audit.ts';
import {resolveFactionReference,referenceLookForKit} from '../src/faction-reference-resolver.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,wardrobeConflicts} from '../src/operator-wardrobe-data.ts';
import {referenceGapFidelity} from '../src/faction-reference-asset-registry.ts';
import {identityMarking,referenceIdentity} from '../src/operator-identity-markings.ts';
import {markingBitmap} from '../src/operator-identity-marking-art.ts';
import {referenceWeaponChoice,referenceWeaponOptions}
 from '../src/faction-reference-weapons.ts';

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

test('FAL family is distributed to dated, documented faction previews without false universal issue',()=>{
 const options=(id)=>referenceWeaponOptions(id);
 assert.equal(referenceWeaponChoice('sadf-nutria-1985').presetId,'fal-5000');
 assert.equal(referenceWeaponChoice('rhodesian-brushstroke-1975').presetId,'fal-5000');
 const rhodesian=options('rhodesian-brushstroke-1975');
 assert.deepEqual(rhodesian.map(x=>x.presetId),['fal-5000','fal-5061']);
 assert.equal(referenceWeaponChoice('rhodesian-brushstroke-1975','fal-5061').presetId,'fal-5061');
 assert.deepEqual(options('ukraine-mm14-2022').map(x=>x.presetId),
  ['ak-ak74m','fal-5061']);
 const alt=resolveFactionReference('ukraine-mm14-2022','fal-5061');
 assert.equal(alt.weapon.presetId,'fal-5061');
 assert.equal(alt.technicalIssues.length,0);
 // October 2022 Para delivery cannot be applied to a Feb-Mar volunteer kit.
 assert.deepEqual(options('ukraine-territorial-2022').map(x=>x.presetId),['ak-akm']);
 for(const id of ['belgian-jigsaw-1995','british-dpm-1995',
  'australian-dpcu-2004','sandf-s2000-2015']){
  assert.ok(options(id).every(x=>!x.presetId.startsWith('fal-')),
   id+' needs its dated predominant service weapon, not a speculative FAL');
 }
 assert.throws(()=>referenceWeaponChoice('ukraine-mm14-2022','fal-5063'),
  /Unsupported preview weapon/);
 assert.deepEqual(auditFactionReferences().issues,[]);
});

test('reference refresh explicitly selects compatible footwear, belts and canonical backpacks',()=>{
 for(const ref of FACTION_REFERENCES){
  const resolved=resolveFactionReference(ref);
  assert.equal(resolved.kit.slots.feet,ref.kit.feet,ref.id);
  assert.equal(resolved.kit.slots.belt,ref.kit.belt,ref.id);
  assert.equal(resolved.kit.slots.backpack,ref.kit.backpack,ref.id);
  assert.equal(resolved.wardrobe.styles.footwear,ref.styles.footwear,ref.id);
  assert.equal(resolved.wardrobe.styles.beltStyle,ref.styles.beltStyle,ref.id);
  assert.equal(resolved.wardrobe.footwearColor,ref.gearAppearance.footwearColor,ref.id);
  assert.equal(resolved.wardrobe.beltSolid,ref.gearAppearance.beltSolid,ref.id);
  assert.deepEqual(resolved.technicalIssues,[],ref.id);
 }
 assert.equal(resolveFactionReference('us-army-erdl-1970').kit.slots.backpack,'backpack-none');
 assert.equal(resolveFactionReference('us-army-ocp-2019').kit.slots.backpack,'backpack-assault');
 assert.equal(resolveFactionReference('nva-strichtarn-1980').kit.slots.belt,'belt-none');
 assert.equal(resolveFactionReference('us-police-polo-2020').kit.slots.belt,'belt-standard');
 assert.equal(resolveFactionReference('ukraine-territorial-2022').kit.slots.feet,'feet-light');
});
test('new visual weapon options remain reference-only and retain honest proxy fidelity',()=>{
 const sweden=referenceWeaponChoice('swedish-m90-2000');
 assert.equal(sweden.presetId,'fnc-service');
 assert.equal(sweden.fidelity,'proxy');
 for(const [id,preset] of [['us-swat-mp5-1995','r870-police-wood'],
  ['us-swat-2015','r870-police-synthetic'],['us-police-polo-2020','r870-police-synthetic']]){
  const visual=resolveFactionReference(id,preset);
  assert.equal(visual.weapon.presetId,preset);
  assert.equal(visual.weapon.weapon,'shotgun');
  assert.equal(visual.weapon.fidelity,'representative');
  assert.deepEqual(visual.technicalIssues,[],id);
 }
});

test('reference look never carries an incompatible shoe color or waist finish onto owned kit',()=>{
 const kit=initialEquipmentLoadout('carbine');
 const before=JSON.stringify(kit);
 const civilian=referenceLookForKit('ukraine-territorial-2022',kit);
 assert.ok(civilian.substituted.includes('footwear'));
 assert.equal(civilian.wardrobe.footwearColor,undefined);
 assert.equal(JSON.stringify(kit),before);
});

test('optional pack studies resolve on current assets without altering dated defaults',()=>{
 for(const ref of FACTION_REFERENCES){
  const baseline=resolveFactionReference(ref);
  const snapshot=JSON.stringify(baseline);
  for(const study of referencePackStudies(ref.id)){
   const preview=resolveReferencePreview(ref.id,undefined,study.id);
   assert.equal(preview.kit.slots.backpack,canonicalPackEquipment(study.style),ref.id+' '+study.id);
   assert.equal(preview.wardrobe.styles.packStyle,study.style);
   assert.deepEqual(preview.technicalIssues,[],ref.id+' '+study.id);
   assert.deepEqual(preview.incompatibleChannels,baseline.incompatibleChannels);
  }
  assert.equal(JSON.stringify(resolveFactionReference(ref)),snapshot);
 }
 assert.throws(()=>resolveReferencePreview('us-desert-1991',undefined,'medical'));
});
test('optional sidearm art stays unloaded and is never a historical or saved kit default',()=>{
 for(const ref of FACTION_REFERENCES){
  if(!referenceSidearmStudyAvailable(ref.id))continue;
  const study=resolveReferencePreview(ref.id,undefined,undefined,true);
  assert.equal(study.kit.secondary.weapon,'glock-g19-gen3');
  assert.equal(study.kit.secondary.loadedRounds,0);
  assert.equal(study.kit.secondary.loadedMagazineId,null);
  assert.deepEqual(study.kit.secondary.spareMagazines,[]);
  assert.equal(resolveFactionReference(ref).kit.secondary.weapon,null);
 }
 assert.throws(()=>resolveReferencePreview('us-desert-1991',undefined,undefined,true));
});

test('dated costume fixed-slot render quotes are deterministic and nonmutating',()=>{
 for(const ref of FACTION_REFERENCES){
  const {kit,wardrobe,weapon}=resolveFactionReference(ref);
  const source={kit,wardrobe,magazines:[],primaryPart:weapon.weaponConfiguration.build?.parts.magazine};
  const before=JSON.stringify(source);
  const first=quoteUnifiedLoadout(source);
  assert.deepEqual(quoteUnifiedLoadout(source),first,ref.id);
  assert.equal(JSON.stringify(source),before,ref.id);
  const waist=first.manifest.placements.flatMap(x=>x.waist?[x.waist]:[]);
  for(let i=0;i<waist.length;i++)for(let j=i+1;j<waist.length;j++)
   assert.equal(waistPlacementsConflict(waist[i],waist[j]),false,ref.id);
 }
});

test('reference costumes exercise the actual posed rig and release preview holders when switching',()=>{
 const rig=createOperatorRig('reference-art-review','blue');
 const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,reload:0,reloadDuration:0,lastThrowAt:-100,
  lastDoorAt:-100,down:false,surrender:false,aiming:false,firing:false,
  turning:0,deterministic:true};
 const examples=[
  ['us-army-erdl-1970',undefined,false],
  ['us-army-ocp-2019','medical',false],
  ['us-navy-aor1-2014','panel',false],
  ['ukraine-territorial-2022','civilian',false],
  ['us-police-polo-2020',undefined,true],
  ['us-swat-2015',undefined,true]
 ];
 try{
  for(const [id,pack,sidearm] of examples){
   const ref=resolveReferencePreview(id,undefined,pack,sidearm);
   const {kit,wardrobe,weapon}=ref;
   const before=JSON.stringify(ref);
   const carry=quoteUnifiedLoadout({kit,wardrobe,magazines:[],
    primaryPart:weapon.weaponConfiguration.build?.parts.magazine});
   poseOperator(rig,{...base,weapon:weapon.weapon,
    weaponConfiguration:weapon.weaponConfiguration,equipment:kit,wardrobe,
    unifiedCarry:carry,magazineCarryLocations:[]},0);
   assert.equal(JSON.stringify(ref),before,id);
   assert.equal(!!rig.visualKit.packPreview.active,kit.slots.backpack!=='backpack-none',id);
   const holders=[];
   rig.root.traverse(o=>{if(o.name.startsWith('bt4-live-'))holders.push(o);});
   const ids=holders.flatMap(o=>o.userData.bt4SlotIds??[]);
   assert.equal(new Set(ids).size,ids.length,id+' duplicate holder slot');
   clearLiveUnifiedCarry(rig);
   for(const holder of holders)assert.equal(holder.parent,null,id+' stale holder');
  }
 }finally{clearLiveUnifiedCarry(rig);rig.dispose();}
});
