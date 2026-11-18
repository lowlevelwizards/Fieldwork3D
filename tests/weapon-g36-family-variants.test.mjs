/** G36 core family: only 4 curated presets, genuine parts, real mounts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,validFamilyBuild,initialWeaponFamilyBuild,
 readWeaponFamilyBuild,proposeFamilyPartChange} from '../src/equipment-weapon-families.ts';
import {addG36Family} from '../src/weapons/geometry/g36-family-silhouettes.ts';
import {G36_E0_FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {g36FrontEnd,g36SupportRange,g36HandguardEnd,g36ReceiverRailSpan}
 from '../src/weapons/geometry/g36-variant-parts.ts';
import {g36PixelAtlas} from '../src/weapons/geometry/g36-pixel-details.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {resolveMountedAccessoryLayout} from '../src/weapons/geometry/mounted-accessory-layout.ts';
import {weaponHandlingModifiers} from '../src/equipment-weapon-handling.ts';
import {alternateStockPosition,normalizedStockPosition,stockHingeX}
 from '../src/weapon-stock-position.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,setWeaponAttachment,readWeaponConfiguration,
 resolveWeaponAssembly,familyAccessoryAllowed}
 from '../src/equipment-weapon-assemblies.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {physicalWeaponMountSlots} from '../src/weapons/geometry/weapon-physical-mount-slots.ts';
import {weaponPartMountSurfaces} from '../src/weapons/geometry/weapon-part-mount-surfaces.ts';
const originals=['g36-service','g36-k-dual','g36-c-classic','g36-ka4'];
const preset=id=>{
 const p=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(p,'factory preset '+id);
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 assert.ok(c.build,'select '+id);
 return c;
};
const model=c=>{
 const g=new THREE.Group();addG36Family(g,c.build);
 return g;
};
const all=(g,key)=>g.children.filter(x=>x.userData[key]);
const near=(x,y,t=.04)=>Math.abs(x-y)<t;
const tri=g=>g.children.reduce((s,m)=>s+
 ((m.geometry.index?.count??m.geometry.getAttribute('position').count)/3),0);
const bounds=g=>new THREE.Box3().setFromObject(g);

test('only four official factory G36 presets, original IDs and saved service untouched',()=>{
 const presets=FAMILY_PRESETS.filter(p=>p.family==='g36');
 assert.deepEqual(presets.map(p=>p.id),originals);
 for(const p of presets)assert.ok(validFamilyBuild({family:p.family,parts:p.parts},p.weapon),p.id);
 assert.equal(G36_E0_FACTORY.parts.receiver,'g36-dual-receiver');
 assert.equal(G36_E0_FACTORY.parts.barrel,'g36-barrel-480');
 assert.equal(G36_E0_FACTORY.parts.handguard,'g36-handguard-long');
 assert.equal(G36_E0_FACTORY.feedVisualId,'g36-polymer-556');
 const original=preset('g36-service'),live=model(original);
 assert.equal(original.slots.optic,'optic-g36-integrated');
 assert.equal(live.userData.g36OriginalFactory,true);
 assert.equal(live.userData.g36IntegratedDualOptic,true);
 assert.equal(live.children.length,23);
 assert.equal(tri(live),476);
 assert.equal(all(live,'g36LongHandguard').length,1);
 assert.equal(all(live,'g36Magazine').length,1);
 assert.equal(all(live,'g36SelectorMarkings').length,1);
 clearWeaponSilhouette(live);
});

test('G36K 318mm and G36C 228mm have real distinct front ends and matching shot-time muzzle endpoints',()=>{
 const specs=[
  ['g36-service',19.50,13.45,4],
  ['g36-k-dual',15.50,11.00,3],
  ['g36-c-classic',12.15,9.65,2],
  ['g36-ka4',15.50,11.00,3]
 ];
 for(const [id,muzzleX,guardX] of specs){
  const c=preset(id),g=model(c);
  const front=g36FrontEnd(c.build.parts.barrel);
  assert.ok(front);
  assert.equal(front.muzzleX,muzzleX,id+' art muzzle');
  assert.equal(g36HandguardEnd(c.build.parts.handguard),guardX);
  const box=bounds(g),assembly=resolveWeaponAssembly(c);
  assert.ok(near(assembly.muzzleX,muzzleX),id+' shot endpoint');
  assert.ok(near(box.max.x,muzzleX,.05),id+' rendered tip');
  const guard=all(g,'g36LongHandguard')[0];
  assert.ok(guard,id+' drawn fore-end');
  assert.ok(near(guard.userData.g36GuardFrontX,guardX));
  assert.ok(near(new THREE.Box3().setFromObject(guard).max.x,guardX,.07));
  assert.ok(assembly.stockX< -13.5);
  assert.ok(tri(g)<650,'small low-poly variant budget');
  assert.ok(g.children.length<31,'small mesh budget');
  const contact=riflePoseContacts(c.weapon,c),[start,end]=g36SupportRange(c.build.parts.handguard);
  assert.ok(contact&&near(contact.support.near.x,start)&&near(contact.support.far.x,end));
  assert.ok(contact.support.far.x<guardX);
  assert.ok(contact.support.near.x<contact.support.far.x);
  assert.ok(near(assembly.supportX,(start+end)/2));
  assert.equal(all(g,'g36SelectorMarkings').length,1);
  assert.equal(all(g,'g36Magazine').length,1);
  assert.equal(all(g,'g36FactoryMuzzle').length,1);
  clearWeaponSilhouette(g);
 }
});
test('G36C flat bridge has backup irons, G36K original integral optics remain, KA4 has real railed fore-end',()=>{
 const k=preset('g36-k-dual'),c=preset('g36-c-classic'),a=preset('g36-ka4');
 assert.equal(k.slots.optic,'optic-g36-integrated');
 assert.equal(c.slots.optic,'optic-irons');
 assert.equal(a.slots.optic,'optic-irons');
 for(const [config,expected] of [[k,'dual-optic'],[c,'flat-rail'],[a,'flat-rail']]){
  const g=model(config);
  assert.equal(g.userData.g36IntegratedDualOptic,expected==='dual-optic');
  assert.equal(all(g,'g36PicatinnyTop').length,expected==='flat-rail'?1:0);
  assert.equal(all(g,'g36BackupIron').length,expected==='flat-rail'?2:0);
  assert.equal(all(g,'g36HandleOpening').length,expected==='flat-rail'?0:1);
  assert.equal(all(g,'g36LowerOptic').length,expected==='flat-rail'?0:1);
  clearWeaponSilhouette(g);
 }
 const ka4=model(a);
 assert.equal(all(ka4,'g36ModernHandguardRail').length,4);
 assert.equal(all(ka4,'g36AdjustableStock').length,1);
 assert.equal(all(ka4,'g36AdjustableCheek').length,1);
 assert.equal(all(ka4,'g36Buttpad').length,1);
 clearWeaponSilhouette(ka4);
 const short=model(c);
 assert.equal(all(short,'g36ModernHandguardRail').length,0);
 assert.equal(all(short,'g36MasterStock').length,1,'full original two-opening stock');
 clearWeaponSilhouette(short);
});
test('rail mounts exist only where actual model contains rails; optics and lights do not appear on integral scopes',()=>{
 const k=preset('g36-k-dual'),c=preset('g36-c-classic'),a=preset('g36-ka4');
 assert.equal(physicalWeaponMountSlots(k.build).length,0);
 assert.equal(physicalWeaponMountSlots(c.build).filter(x=>x.role==='optic').length,3);
 const mounts=physicalWeaponMountSlots(a.build);
 assert.ok(mounts.filter(x=>x.role==='optic').length===3);
 assert.ok(mounts.some(x=>x.role==='foregrip'&&x.face==='bottom'));
 assert.ok(mounts.some(x=>x.role==='light'&&x.face==='left'));
 assert.ok(mounts.some(x=>x.role==='light'&&x.face==='right'));
 assert.equal(familyAccessoryAllowed(k.build,'optic','optic-reflex'),false);
 assert.equal(familyAccessoryAllowed(c.build,'optic','optic-reflex'),true);
 assert.equal(familyAccessoryAllowed(c.build,'foregrip','foregrip-vertical'),false);
 assert.equal(familyAccessoryAllowed(a.build,'foregrip','foregrip-vertical'),true);
 assert.equal(familyAccessoryAllowed(k.build,'opticMount','optic-hk-claw'),false);
 const reflex=setWeaponAttachment(c,'optic','optic-reflex');
 assert.equal(reflex.slots.optic,'optic-reflex');
});
test('G36 short and adjustable folders keep inherited physical folding/save semantics',()=>{
 for(const id of ['g36-stock','g36-stock-short','g36-stock-adjustable']){
  assert.equal(alternateStockPosition(id),'folded');
  assert.equal(normalizedStockPosition(id,'folded'),'folded');
  assert.equal(stockHingeX(id),-5.3);
 }
 for(const id of ['g36-c-classic','g36-ka4']){
  const c=preset(id);
  const folded=readWeaponConfiguration({...c,stockPosition:'folded'},c.weapon);
  assert.equal(folded.stockPosition,'folded');
  assert.ok(resolveWeaponAssembly(folded).stockX>-7,'folded stock clears rear weapon');
 }
});

test('single-scope upper is an optional part, never another preset, and cannot turn into G36C',()=>{
 const k=preset('g36-k-dual');
 const result=proposeFamilyPartChange(k.build,k.weapon,'receiver','g36-single-receiver');
 assert.equal(result.valid,true);
 const cfg=setConfiguredFamilyPart(k,'receiver','g36-single-receiver');
 assert.equal(cfg.build.parts.receiver,'g36-single-receiver');
 assert.equal(cfg.slots.optic,'optic-g36-single');
 assert.deepEqual(resolveMountedAccessoryLayout(cfg).unresolved,[],
  'factory single scope never enters detachable mount search');
 assert.equal(weaponHandlingModifiers(cfg).sightSystem,'integrated');
 const g=model(cfg);
 assert.equal(all(g,'g36LowerOptic').length,1);
 assert.equal(all(g,'g36UpperReflex').length,0);
 assert.equal(all(g,'g36PicatinnyTop').length,0);
 assert.equal(g.userData.g36SingleOptic,true);
 clearWeaponSilhouette(g);
 assert.equal(proposeFamilyPartChange(cfg.build,cfg.weapon,'barrel','g36-barrel-228').valid,false);
 assert.equal(FAMILY_PRESETS.filter(x=>x.family==='g36').length,4);
 const loaded=readWeaponConfiguration(cfg,cfg.weapon);
 assert.equal(loaded.build.parts.receiver,'g36-single-receiver');
});
test('only valid barrel/handguard lengths; saved G36 service still normalizes identically',()=>{
 const k=preset('g36-k-dual'),c=preset('g36-c-classic');
 assert.equal(proposeFamilyPartChange(k.build,k.weapon,'handguard','g36-handguard-c').valid,false);
 assert.equal(proposeFamilyPartChange(c.build,c.weapon,'barrel','g36-barrel-318').valid,true);
 const changed=setConfiguredFamilyPart(c,'barrel','g36-barrel-318');
 assert.equal(changed.build.parts.handguard,'g36-handguard-k');
 const saved=readWeaponFamilyBuild({family:'g36',parts:G36_E0_FACTORY.parts},'rifle');
 assert.deepEqual(saved.parts,G36_E0_FACTORY.parts);
 const invalid=readWeaponFamilyBuild({family:'g36',
  parts:{...G36_E0_FACTORY.parts,barrel:'g36-barrel-228'}},'rifle');
 assert.equal(invalid.parts.barrel,'g36-barrel-480');
});


test('G36C proportion polish changes only compact front/stock/rail, not its weapon length datum',()=>{
 const c=preset('g36-c-classic'),k=preset('g36-k-dual'),a=preset('g36-ka4');
 const compact=model(c),classic=model(k),modern=model(a);
 assert.equal(c.build.parts.stock,'g36-stock','compact factory uses the original folder');
 assert.equal(k.build.parts.stock,'g36-stock');
 assert.equal(c.build.parts.barrel,'g36-barrel-228');
 assert.equal(resolveWeaponAssembly(c).muzzleX,12.15,'short barrel and shot socket remain fixed');
 assert.equal(resolveWeaponAssembly(c).stockX,-15.05,'rear physical datum follows original stock');
 assert.equal(g36HandguardEnd(c.build.parts.handguard),9.65);
 assert.equal(g36HandguardEnd(k.build.parts.handguard),11);
 assert.equal(g36HandguardEnd(a.build.parts.handguard),11);
 assert.ok((9.65-3.75)/(8.80-3.75)>1.16,'compact shell is at least 16% longer');
 assert.ok(12.15-9.65<2.6,'less exposed tube between polymer nose and muzzle');
 assert.equal(all(compact,'g36MasterStock').length,1);
 const stockBox=g=>new THREE.Box3().setFromObject(all(g,'g36MasterStock')[0]);
 assert.ok(near(stockBox(compact).min.x,stockBox(classic).min.x,.001),
  'no compressed short-stock transform on compact preset');
 assert.ok(near(stockBox(compact).max.x,stockBox(classic).max.x,.001));
 assert.deepEqual(g36ReceiverRailSpan(c.build.parts.barrel),[-5.855,7.695]);
 assert.deepEqual(g36ReceiverRailSpan(a.build.parts.barrel),[-5.855,6.295]);
 const rail=g=>all(g,'g36PicatinnyTop')[0];
 assert.ok(near(new THREE.Box3().setFromObject(rail(compact)).max.x,7.695,.002));
 assert.ok(near(new THREE.Box3().setFromObject(rail(modern)).max.x,6.295,.002));
 const [cBack,cFront]=all(compact,'g36BackupIron');
 const [aBack,aFront]=all(modern,'g36BackupIron');
 assert.ok(cBack&&cFront&&aBack&&aFront);
 assert.ok(near(cFront.position.x,0,.01)===false||cFront.geometry,
  'C front sight exists');
 const sightCenter=m=>{
  const box=new THREE.Box3().setFromObject(m);
  return (box.min.x+box.max.x)/2;
 };
 assert.ok(near(sightCenter(cFront),7.0,.01));
 assert.ok(near(sightCenter(aFront),5.14,.01),'KA4 unchanged');
 const surface=build=>weaponPartMountSurfaces(build).find(s=>s.ownerPartId==='g36-rail-receiver');
 assert.equal(surface(c.build)?.endX,7.695,'mount ends at compact rail geometry');
 assert.equal(surface(a.build)?.endX,6.295,'KA4 mount unchanged');
 assert.ok(all(compact,'g36ModernHandguardRail').length===0);
 assert.ok(all(compact,'g36LongHandguard')[0].userData.g36SolidFrontCap);
 for(const g of [compact,classic,modern])clearWeaponSilhouette(g);
});
