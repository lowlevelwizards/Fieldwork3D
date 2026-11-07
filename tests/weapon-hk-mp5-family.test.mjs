/** MP5 family: strong distinctive silhouettes with no legacy HK regression. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS,compatibleFamilyPart,matchingFamilyPreset}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 readWeaponConfiguration,resolveWeaponAssembly,setWeaponAttachment,
 setConfiguredFamilyPart}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {mp5MagazineCurve,mp5MagazineOutline,MP5_MAG_LENGTH}
 from '../src/weapons/geometry/hk-mp5-magazine-profiles.ts';
import {hk556MagazineCurve}
 from '../src/weapons/geometry/hk-556-magazine-profiles.ts';
import {carriedMagazineGeometry,carriedMagazineProfile}
 from '../src/operator-carried-magazines.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {lowReadyArchetype} from '../src/breach-low-ready-archetypes.ts';
import {fitWeaponPose,stocklessMP5K}
 from '../src/breach-weapon-pose.ts';
import {stockPocket} from '../src/breach-anatomy.ts';
import {HK_BARREL_ART} from '../src/weapons/geometry/hk-barrel-profiles.ts';
import {HK9_MAG_METAL,HK556_MAG_METAL}
 from '../src/weapons/geometry/weapon-visual-palette.ts';

const ids=['hk-mp5a3','hk-mp5sd3','hk-mp5k','hk-mp5a2','hk-mp5sd2'];
const metal=new THREE.MeshBasicMaterial(),dark=new THREE.MeshBasicMaterial();
function create(id){
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset,'missing '+id);
 const config=selectWeaponFamilyPreset(
  initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(preset.weapon,metal,dark,config);
 group.updateMatrixWorld(true);
 return {config,group};
}
test('five genuine SMG factory models, one 9mm feed, saved builds roundtrip',()=>{
 assert.equal(FAMILY_PRESETS.length,27);
 assert.equal(FAMILY_PRESETS.filter(x=>x.family==='hk').length,10);
 assert.equal(FAMILY_PRESETS.filter(x=>x.weapon==='smg').length,5);
 for(const id of ids){
  const {config,group}=create(id);
  assert.equal(config.weapon,'smg',id);
  assert.equal(matchingFamilyPreset(config.build)?.id,id);
  assert.equal(FAMILY_PARTS[config.build.parts.magazine].feed,'hk9');
  assert.deepEqual(readWeaponConfiguration(
   JSON.parse(JSON.stringify(config)),'smg'),config);
  assert.ok(group.children.length>=12&&group.children.length<=34,
   id+' strong mesh economy');
  assert.equal(selectWeaponFamilyPreset(
   initialWeaponConfiguration('carbine'),id).build,undefined,
   'SMG model cannot silently convert owned carbine');
  const receiver=config.build.parts.receiver;
  for(const incompatible of ['hk-g3-mag20','hk556-mag25','ar-mag30','ak-mag545'])
   assert.equal(compatibleFamilyPart(receiver,'magazine',incompatible,'smg'),
    false,incompatible+' does not fit 9mm');
  assert.equal(setConfiguredFamilyPart(config,'magazine','hk556-mag25'),config);
  clearWeaponSilhouette(group);
 }
});
test('three silhouette landmarks, no fake scaling or muzzle drift',()=>{
 const lengths=[['hk-mp5a3',-13.05,12.65],
  ['hk-mp5sd3',-13.05,16.60],['hk-mp5k',-6.65,6.05],
  ['hk-mp5a2',-13.05,12.65],['hk-mp5sd2',-13.05,16.60]];
 for(const [id,rear,muzzle] of lengths){
  const {config,group}=create(id);
  const bounds=new THREE.Box3().setFromObject(group);
  const a=resolveWeaponAssembly(config);
  assert.ok(Math.abs(bounds.min.x-rear)<.001,id+' rear envelope');
  assert.ok(Math.abs(bounds.max.x-muzzle)<.001,id+' external muzzle');
  assert.ok(Math.abs(a.stockX-rear)<.001,id+' rear endpoint');
  assert.ok(Math.abs(a.muzzleX-muzzle)<.001,id+' game muzzle');
  assert.equal(group.children.filter(x=>x.userData.hkRearSight==='diopter-drum').length,1);
  assert.equal(group.children.filter(x=>x.userData.hkMP5FrontHood).length,1);
  assert.equal(group.children.filter(x=>x.userData.hkCockingHandle).length,1);
  const receiverBox=partVisualBounds(group,'receiver');
  assert.ok(Math.abs(receiverBox.min.x+6.10)<.5,
   'MP5 shares same receiver silhouette dimensions');
  for(const slot of ['receiver','grip','magazine','stock','handguard','barrel'])
   assert.ok(partVisualBounds(group,slot),id+' '+slot);
  clearWeaponSilhouette(group);
 }
});
test('curved 9mm body is narrower, smoother and bends more than HK33 steel mag',()=>{
 const curve=mp5MagazineCurve(),hk33=hk556MagazineCurve('hk556-mag30');
 const outline=mp5MagazineOutline();
 assert.equal(outline.length,10);
 assert.ok(curve.width<hk33.width);
 assert.ok(curve.depth<hk33.depth);
 assert.ok(curve.sweep>hk33.sweep);
 assert.equal(curve.length,MP5_MAG_LENGTH);
 const p=carriedMagazineProfile('hk9-mag30');
 assert.equal(p.family,'hk');assert.equal(p.length,MP5_MAG_LENGTH);
 const carried=carriedMagazineGeometry('hk9-mag30');
 assert.ok(carried.getAttribute('position').count>0);
 carried.dispose();
 for(const id of ids){
  const {group}=create(id);
  const mag=group.children.filter(x=>x.userData.hkMP5SmoothMagazine);
  assert.equal(mag.length,1);
  assert.equal(mag[0].material,HK9_MAG_METAL);
  assert.notEqual(mag[0].material,HK556_MAG_METAL);
  assert.equal(group.children.filter(x=>x.userData.hk556StampedRib).length,0,
   'smooth real-world MP5 9mm mag, no accidental AK rib copy');
  assert.equal(group.children.filter(x=>x.userData.hkMP5MagazineHeel).length,1);
  clearWeaponSilhouette(group);
 }
});
test('A3 and SD3 share exact receiver, magazine, sights and twin-rail stock',()=>{
 const a=create('hk-mp5a3'),b=create('hk-mp5sd3');
 assert.equal(a.group.children.filter(x=>x.userData.hkMP5RetractRail).length,2);
 assert.equal(b.group.children.filter(x=>x.userData.hkMP5RetractRail).length,2);
 assert.equal(a.group.children.filter(x=>x.userData.hkMP5RetractButt).length,1);
 assert.equal(b.group.children.filter(x=>x.userData.hkMP5RetractButt).length,1);
 const common=g=>g.children.filter(x=>x.name.startsWith('family-receiver-'))
  .filter(x=>x.geometry.type==='ExtrudeGeometry')
  .slice(0,3).map(x=>Array.from(x.geometry.getAttribute('position').array));
 assert.deepEqual(common(a.group),common(b.group));
 clearWeaponSilhouette(a.group);clearWeaponSilhouette(b.group);
});
test('SD3 has an intrinsic thick shroud and always ONE integrated suppressor',()=>{
 const {config,group}=create('hk-mp5sd3');
 assert.equal(group.children.filter(x=>x.userData.hkMP5IntegralSuppressor).length,1);
 assert.equal(group.children.filter(x=>x.userData.hkMP5SDShroud).length,1);
 assert.equal(group.children.filter(x=>x.userData.hkMP5SDBand).length,2);
 assert.equal(setWeaponAttachment(config,'muzzle','muzzle-suppressor'),config);
 const handguard=partVisualBounds(group,'handguard'),
  barrel=partVisualBounds(group,'barrel');
 assert.ok(handguard.intersectsBox(barrel),'built-in suppressor seats in shroud');
 assert.ok(Math.abs(new THREE.Box3().setFromObject(group).max.x-16.6)<.001);
 clearWeaponSilhouette(group);
 const silent=buildWeaponSilhouette('smg',metal,dark,config);
 assert.equal(silent.children.filter(x=>x.userData.hkMP5IntegralSuppressor).length,1);
 clearWeaponSilhouette(silent);
});
test('K is truly stockless and held by its oversized integral vertical grip',()=>{
 const k=create('hk-mp5k');
 assert.equal(k.group.children.filter(x=>x.userData.hkMP5StocklessCap).length,1);
 assert.equal(k.group.children.filter(x=>x.userData.hkMP5RetractRail).length,0);
 assert.equal(k.group.children.filter(x=>x.userData.hkMP5KVerticalForegrip).length,1);
 assert.ok(stocklessMP5K(k.config));
 const contact=riflePoseContacts('smg',k.config);
 assert.ok(contact.support.near.x>=3.70);
 assert.ok(contact.support.far.x<=4.85);
 assert.ok(contact.support.near.y<-3,'support target is low, on vertical grip');
 assert.equal(lowReadyArchetype(k.config)?.family,'hk-smg-stockless');
 const fit=fitWeaponPose({
  weapon:'smg',configuration:k.config,handling:'ready',
  yaw:0,recoil:0
 });
 assert.ok(fit.stock.x>stockPocket('ready').x+2,
  'rear cap stays distinctly ahead of shoulder');
 assert.equal(fit.stockError,0,'no phantom stock shoulder penalty');
 assert.ok(Number.isFinite(fit.primary.x)&&Number.isFinite(fit.support.x));
 clearWeaponSilhouette(k.group);
});

test('fixed A2 / SD2 have single solid stocks and keep matching pose landmarks',()=>{
 for(const [id,other] of [['hk-mp5a2','hk-mp5a3'],['hk-mp5sd2','hk-mp5sd3']]){
  const a=create(id),b=create(other);
  assert.equal(a.group.children.filter(x=>x.userData.hkMP5FixedStock).length,1);
  assert.equal(a.group.children.filter(x=>x.userData.hkMP5FixedButtpad).length,1);
  assert.equal(a.group.children.filter(x=>x.userData.hkMP5RetractRail).length,0);
  assert.equal(resolveWeaponAssembly(a.config).stockX,resolveWeaponAssembly(b.config).stockX);
  assert.equal(resolveWeaponAssembly(a.config).muzzleX,resolveWeaponAssembly(b.config).muzzleX);
  clearWeaponSilhouette(a.group);clearWeaponSilhouette(b.group);
 }
});
test('HK has distinct ambi MP5 pictogram and era-appropriate SEF selector housings',()=>{
 for(const id of ids){
  const {group}=create(id);
  assert.equal(group.children.filter(x=>x.userData.hkSelectorMarkings==='pictogram').length,2);
  assert.equal(group.children.filter(x=>x.userData.hkSelectorHub==='pictogram').length,2);
  assert.equal(group.children.filter(x=>x.userData.hkSelectorLever==='pictogram').length,2);
  clearWeaponSilhouette(group);
 }
 for(const id of ['hk-g3a3','hk-hk33a2','hk-hk53a3']){
  const {group}=create(id);
  assert.equal(group.children.filter(x=>x.userData.hkSelectorMarkings==='sef').length,2);
  assert.equal(group.children.filter(x=>x.userData.hkSelectorHub==='sef').length,1);
  assert.equal(group.children.filter(x=>x.userData.hkSelectorLever==='sef').length,1);
  clearWeaponSilhouette(group);
 }
});
