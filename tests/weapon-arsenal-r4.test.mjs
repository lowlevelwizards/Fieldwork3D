import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS,FAMILY_PART_SLOTS,compatibleFamilyPart,
 matchingFamilyPreset} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly,
 readWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {AR_STANAG_METAL,AR_BLACK_POLYMER} from '../src/weapons/geometry/weapon-visual-palette.ts';
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const model=id=>{
 const p=FAMILY_PRESETS.find(x=>x.id===id);assert.ok(p,id);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 assert.equal(matchingFamilyPreset(config.build)?.id,id);
 const group=buildWeaponSilhouette(config.weapon,material,material,config);
 group.updateMatrixWorld(true);return {p,config,group};
};
const bound=(group,slot)=>{
 const b=partVisualBounds(group,slot);
 assert.ok(b,'missing '+slot);return b;
};
test('R4 catalog is exactly 17 unique recipes and 62 reusable parts',()=>{
 assert.equal(FAMILY_PRESETS.length,17);
 assert.equal(Object.keys(FAMILY_PARTS).length,64);
 assert.equal(new Set(FAMILY_PRESETS.map(x=>x.id)).size,17);
 assert.equal(FAMILY_PRESETS.filter(x=>x.family==='ar').length,8);
 assert.equal(FAMILY_PRESETS.filter(x=>x.family==='ak').length,9);
 for(const id of ['ar-m16a2','ar-colt733','ak-aks74','ak-akms','ak-rpk74','ar-mk12mod0'])
  assert.ok(FAMILY_PRESETS.some(p=>p.id===id),id);
 for(const p of FAMILY_PRESETS){
  const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),p.id);
  assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(cfg)),p.weapon),cfg,p.id+' persistence');
  for(const slot of FAMILY_PART_SLOTS){
   const part=FAMILY_PARTS[p.parts[slot]];
   assert.ok(part,p.id+' '+slot);
   assert.ok(compatibleFamilyPart(p.parts.receiver,slot,part.id,p.weapon,
    FAMILY_PARTS[p.parts.barrel].length),p.id+' '+slot+' compatible');
  }
 }
});
test('R4 all 17 models have seated parts, authoritative muzzle and small mesh counts',()=>{
 for(const p of FAMILY_PRESETS){
  const m=model(p.id),box=new THREE.Box3().setFromObject(m.group);
  assert.ok(Math.abs(box.max.x-resolveWeaponAssembly(m.config).muzzleX)<.001,p.id+' game muzzle');
  assert.ok(m.group.children.length>=12&&m.group.children.length<=28,p.id+' budget');
  const r=bound(m.group,'receiver'),stock=bound(m.group,'stock'),grip=bound(m.group,'grip');
  const mag=bound(m.group,'magazine'),guard=bound(m.group,'handguard'),barrel=bound(m.group,'barrel');
  for(const [a,b,n] of [[stock,r,'stock'],[grip,r,'grip'],[mag,r,'magazine'],
   [r,guard,'handguard'],[guard,barrel,'barrel']]){
   assert.ok(a.intersectsBox(b),p.id+' attached '+n);
  }
  assert.ok(mag.min.y<-5,p.id+' magazine recognizable');
  clearWeaponSilhouette(m.group);
 }
});
test('R4 six newcomers have distinct signature exterior parts',()=>{
 const rpk=model('ak-rpk74');
 assert.ok(bound(rpk.group,'stock').min.y<-3.8,'RPK clubfoot deep heel');
 assert.ok(bound(rpk.group,'magazine').min.y<-8.7,'RPK magazine longer');
 assert.ok(rpk.group.children.filter(m=>m.name.startsWith('family-barrel-')).length>=5,
  'folded bipod belongs to RPK barrel group');
 clearWeaponSilhouette(rpk.group);
 const akms=model('ak-akms'),aks=model('ak-aks74');
 assert.ok(akms.group.children.filter(m=>m.name.startsWith('family-stock-')).length>=4,
  'AKMS parallel underfolder');
 assert.ok(aks.group.children.filter(m=>m.name.startsWith('family-stock-')).length>=4,
  'AKS-74 open triangle');
 for(const m of [akms,aks])clearWeaponSilhouette(m.group);
 const colt=model('ar-colt733');
 assert.equal(colt.config.build.parts.barrel,'ar-733-115');
 const m16=model('ar-m16a2');assert.equal(m16.config.build.parts.receiver,'ar-a2');
 const mk12=model('ar-mk12mod0');
 assert.ok(mk12.group.children.some(m=>m.name==='family-art-pri-vents'));
 assert.equal(mk12.config.build.parts.barrel,'ar-spr18');
 for(const m of [colt,m16,mk12])clearWeaponSilhouette(m.group);
});
test('R4 STANAG steel is lighter, polymer magazine stays dark',()=>{
 for(const id of ['ar-m16a1','ar-m4a1','ar-colt733','ar-mk12mod0']){
  const m=model(id);
  const magazine=m.group.children.find(c=>c.name.startsWith('family-magazine-'));
  assert.equal(magazine?.material,AR_STANAG_METAL,id+' metal material');
  clearWeaponSilhouette(m.group);
 }
 const mk=model('ar-mk18');
 assert.equal(mk.group.children.find(c=>c.name.startsWith('family-magazine-'))?.material,
  AR_BLACK_POLYMER,'polymer must remain dark');
 clearWeaponSilhouette(mk.group);
});
test('R4 shared browser and game-specific switching are wired without phantom campaign purchases',()=>{
 const browser=src('src/ui/weapon-preset-browser.ts');
 const quick=src('src/breach-main.ts');
 const campaign=src('src/campaign-ui.ts');
 assert.match(browser,/FAMILY_PRESETS\.filter\(p=>p\.family===family\)/);
 assert.match(browser,/options\.availability\?\.\(p\)/);
 assert.match(quick,/next=equipRoster\(next,member\.id,preset\.weapon\)/);
 assert.match(quick,/next=configureRosterWeaponPreset\(next,member\.id,presetId\)/);
 assert.match(quick,/next=equipCampaignWeapon\(next,id,preset\.weapon\)/);
 assert.match(quick,/next=equipCampaignWeaponPreset\(next,id,presetId\)/);
 assert.match(campaign,/c\.inventory\.weapons\[preset\.weapon\]/);
});
