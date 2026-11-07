/** HK R4: brand-recognizable material finish and selector placement gates. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {HK_BLACK_METAL,HK_DARK_POLYMER,HK_OLIVE_POLYMER,HK_WOOD,
 HK_MAG_METAL,HK556_MAG_METAL,HK9_MAG_METAL,HK556_MAG_RIB,
 HK_SD_SUPPRESSOR_METAL,HK_MUZZLE_METAL} from '../src/weapons/geometry/weapon-visual-palette.ts';
const testMaterial=new THREE.MeshBasicMaterial();
const hk=FAMILY_PRESETS.filter(p=>p.family==='hk');
const model=p=>{
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),p.id);
 const g=buildWeaponSilhouette(p.weapon,testMaterial,testMaterial,c);
 g.updateMatrixWorld(true);return g;
};
const slot=(g,s)=>g.children.filter(x=>x.name.startsWith('family-'+s+'-'));
const pixel=(mark,x,y)=>{
 const img=mark.material.map?.image;
 assert.ok(img?.data);
 const n=(y*img.width+x)*4;
 return [...img.data.slice(n,n+4)];
};
test('HK R4 palette keeps ten authentic factory models and distinct materials',()=>{
 assert.equal(hk.length,10);
 for(const [m,hex] of [[HK_BLACK_METAL,0x3b4140],
  [HK_DARK_POLYMER,0x303433],[HK_OLIVE_POLYMER,0x60694e],
  [HK_WOOD,0x896947],[HK_MAG_METAL,0x505757],
  [HK556_MAG_METAL,0x414747],[HK9_MAG_METAL,0x373d3d],
  [HK556_MAG_RIB,0x353d39],[HK_SD_SUPPRESSOR_METAL,0x2f3434],
  [HK_MUZZLE_METAL,0x2f3533]])assert.equal(m.color.getHex(),hex);
 assert.ok(HK_BLACK_METAL.metalness>HK_DARK_POLYMER.metalness);
 assert.ok(HK_SD_SUPPRESSOR_METAL.metalness>HK_DARK_POLYMER.metalness);
});
test('HK selector symbols remain on the lower, with white SAFE above red fire',()=>{
 for(const p of hk){
  const g=model(p),marks=g.children.filter(x=>x.userData.hkSelectorMarkings);
  assert.equal(marks.length,2,p.id);
  for(const mark of marks){
   assert.equal(mark.userData.hkSelectorAlignedToHousing,true);
   const h=mark.geometry.parameters.height;
   assert.ok(mark.position.y-h/2>-2.25,p.id+' no hanging marker');
   assert.ok(mark.position.y+h/2<-.55,p.id+' stays by trigger');
   assert.ok(Math.abs(mark.position.x+3.21)<.001);
   const x=p.weapon==='smg'?15:17;
   const safe=pixel(mark,x,19),fire=pixel(mark,x,5);
   assert.ok(safe[0]>200&&safe[1]>200,p.id+' SAFE uppermost');
   assert.ok(fire[0]>155&&fire[0]>fire[1]*2,p.id+' red firing below');
  }
  assert.equal(g.children.filter(x=>x.userData.hkSelectorLever).length,
   p.weapon==='smg'?2:1,p.id+' selector generations');
  clearWeaponSilhouette(g);
 }
});
test('every HK part uses its intended black/olive/wood/steel family finish',()=>{
 for(const p of hk){
  const g=model(p),receiver=slot(g,'receiver'),stock=slot(g,'stock'),
    handguard=slot(g,'handguard'),mag=slot(g,'magazine');
  assert.ok(receiver.length&&stock.length&&handguard.length&&mag.length,p.id);
  assert.equal(receiver[0].material,HK_BLACK_METAL,p.id+' stamped receiver');
  if(p.id==='hk-g3'){
   assert.equal(stock[0].material,HK_WOOD,'early G3 wood stock');
   assert.equal(handguard[0].material,HK_WOOD,'early G3 wood fore-end');
   assert.equal(receiver[1].material,HK_BLACK_METAL,'early metal lower');
  }
  if(p.id==='hk-g3a3')assert.equal(stock[0].material,HK_OLIVE_POLYMER);
  if(p.id==='hk-g3a3'||p.id==='hk-g3a4')
   assert.equal(handguard[0].material,HK_OLIVE_POLYMER);
  if(p.id==='hk-hk33a2'){
   assert.equal(stock[0].material,HK_DARK_POLYMER);
   assert.equal(handguard[0].material,HK_DARK_POLYMER);
  }
  if(p.id==='hk-hk53a3')assert.equal(handguard[0].material,HK_DARK_POLYMER);
  const expected=p.weapon==='smg'?HK9_MAG_METAL:
   p.id==='hk-hk33a2'||p.id==='hk-hk53a3'?HK556_MAG_METAL:HK_MAG_METAL;
  assert.equal(mag[0].material,expected,p.id+' dark steel magazine');
  if(p.weapon==='smg'||p.id.startsWith('hk-hk'))
   assert.equal(receiver[1].material,HK_DARK_POLYMER,p.id+' polymer lower');
  const flash=g.children.filter(x=>x.userData.hkFactoryFlashHider);
  if(p.id==='hk-mp5sd2'||p.id==='hk-mp5sd3'){
   const sd=g.children.filter(x=>x.userData.hkMP5IntegralSuppressor);
   assert.equal(sd.length,1);
   assert.equal(sd[0].material,HK_SD_SUPPRESSOR_METAL);
   assert.equal(flash.length,0);
  }else{
   assert.equal(flash.length,1,p.id+' flash hider');
   assert.equal(flash[0].material,HK_MUZZLE_METAL);
  }
  clearWeaponSilhouette(g);
 }
});
