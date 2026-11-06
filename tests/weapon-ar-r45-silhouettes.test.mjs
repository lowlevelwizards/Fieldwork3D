/** AR R4.5: iconic silhouettes and the actual live rifle mount contracts.
 * Tests inspect render geometry; no firearm engineering or new ballistics.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {AR_VISUAL_AXIS_Y,AR_BARREL_ART}
 from '../src/weapons/geometry/ar-barrel-profiles.ts';
import {AR_VISUAL_ANATOMY} from '../src/weapons/geometry/weapon-receiver-anatomy.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const close=(a,b,e=.001)=>Math.abs(a-b)<e;
function model(id){
 const p=FAMILY_PRESETS.find(x=>x.id===id);assert.ok(p,id);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const group=buildWeaponSilhouette(p.weapon,mat,mat,config);
 group.updateMatrixWorld(true);
 return {p,config,group};
}
const bounds=(group,slot)=>{
 const b=partVisualBounds(group,slot);assert.ok(b,slot);return b;
};
const has=(group,mark)=>group.children.some(x=>x.name==='family-art-'+mark);
const cast=(group,x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,25),
 new THREE.Vector3(0,0,-1)).intersectObjects(
 group.children.filter(o=>!o.userData.weaponPixelArt),true).length>0;

test('R4.5 shared AR axis and hand contact stay aligned across all eight presets',()=>{
 assert.equal(FAMILY_PRESETS.filter(p=>p.family==='ar').length,8);
 for(const p of FAMILY_PRESETS.filter(p=>p.family==='ar')){
  const {config,group}=model(p.id),a=resolveWeaponAssembly(config);
  assert.ok(close(a.muzzleY,AR_VISUAL_AXIS_Y));
  assert.ok(a.primaryX<-3,'pistol-hand contact follows rearward grip');
  assert.ok(a.supportY>-1.7,'support-hand contact rises with fore-end');
  const barrel=group.children.find(x=>x.name.startsWith('family-barrel-')&&
   x.name.endsWith('-0'));
  assert.ok(barrel&&close(barrel.position.y,AR_VISUAL_AXIS_Y),
   p.id+' barrel and muzzle use the same raised visual center');
  assert.ok(bounds(group,'barrel').intersectsBox(bounds(group,'handguard')));
  assert.ok(bounds(group,'grip').intersectsBox(bounds(group,'receiver')));
  assert.ok(group.children.length<=36,p.id+' mobile mesh ceiling');
  assert.ok(close(new THREE.Box3().setFromObject(group).max.x,a.muzzleX));
  clearWeaponSilhouette(group);
 }
});
test('R4.5 A-frame has vertical front, strongly sloped rear and aligned tall top',()=>{
 const ids=['ar-m16a1','ar-m16a2','ar-m16a4','ar-car15','ar-colt733','ar-m4a1'];
 for(const id of ids){
  const {config,group}=model(id);
  const s=AR_BARREL_ART[config.build.parts.barrel].sightX;
  assert.ok(s!==null,id+' fixed sight marker');
  assert.ok(cast(group,s+.68,1.78),id+' solid vertical front leg');
  assert.ok(cast(group,s+.68,3.74),id+' same x at top of front leg');
  assert.equal(cast(group,s+.09,2.10),false,id+' large clean A-frame opening');
  assert.ok(close(bounds(group,'barrel').max.y,4.02),id+' top at rear sight');
  const gap=s-bounds(group,'handguard').max.x;
  assert.ok(gap>.55&&gap<1.4,id+' front sight immediately beyond handguard');
  clearWeaponSilhouette(group);
 }
});
test('R4.5 receiver loses rear block and trigger-guard bar, gains handle and assist',()=>{
 const {group}=model('ar-m4a1');
 const receiver=group.children.filter(x=>x.name.startsWith('family-receiver-'));
 const boxes=receiver.filter(x=>x.geometry.type==='BoxGeometry');
 assert.ok(boxes.some(x=>close(x.position.x,-6.35)&&
  close(x.position.y,1.82)&&x.geometry.parameters.depth>=3.9),
  'low horizontal rear charging handle');
 assert.ok(boxes.some(x=>close(x.position.x,-1.34)&&
  close(x.rotation.z,-.34)),'one angled forward assist behind port');
 assert.equal(boxes.filter(x=>close(x.position.x,-5.7)&&
  x.geometry.parameters.height>3).length,0,'old tall rear lump removed');
 assert.ok(!receiver.some(x=>x.geometry.type==='ExtrudeGeometry'&&
  new THREE.Box3().setFromObject(x).max.y<-2.2),
  'no freestanding trigger-guard line');
 clearWeaponSilhouette(group);
});
test('R4.5 STANAGs are broad, slim in Z and read through restrained art',()=>{
 assert.ok(AR_VISUAL_ANATOMY.magazineWidthX>=3.3);
 assert.ok(AR_VISUAL_ANATOMY.magazineDepthZ<=1.9);
 for(const [id,mark] of [
  ['ar-m16a1','ar-mag-stamp20'],['ar-m4a1','ar-mag-stamp30'],
  ['ar-mk18','ar-poly-panel']]){
  const {group}=model(id),mag=bounds(group,'magazine');
  assert.ok(mag.max.x-mag.min.x>=3.3,id+' wide front-back');
  assert.ok(mag.max.z-mag.min.z<=2.18,id+' slim lateral thickness');
  assert.equal(group.children.filter(x=>x.name==='family-art-'+mark).length,2,
   id+' two-side pressed art');
  if(id==='ar-mk18')
   assert.ok(group.children.some(x=>x.name.startsWith('family-magazine-')&&
    x.material!==group.children.find(y=>y.name.startsWith('family-magazine-')).material),
    'polymer mag has contrasting tan plate');
  else assert.equal(group.children.filter(x=>x.name.startsWith('family-magazine-')).length,1,
   'no detached metal magazine floorplate');
  clearWeaponSilhouette(group);
 }
});
test('R4.5 plastic ribs, dark A1 vents, real rail blocks, PRI remain different',()=>{
 const kinds=[['ar-m16a1','a1-vents'],['ar-m16a2','poly-ribs'],
  ['ar-car15','car-ribs'],['ar-m16a4','m5-panel'],
  ['ar-m4a1','ras-panel'],['ar-mk18','ris-panel'],
  ['ar-mk12mod0','pri-vents']];
 for(const [id,mark] of kinds){
  const {group}=model(id);
  assert.ok(has(group,mark),id+' correct family detail');
  if(['ar-m16a4','ar-m4a1','ar-mk18'].includes(id)){
   const cuboids=group.children.filter(x=>x.name.startsWith('family-handguard-')&&
    x.geometry.type==='BoxGeometry');
   assert.ok(cuboids.length>=7,id+' large modeled stepped rail pieces');
  }
  if(id==='ar-mk12mod0')
   assert.ok(group.children.some(x=>x.geometry.type==='CylinderGeometry'&&
    x.geometry.parameters.radialSegments===6),'PRI tube not replaced by rail');
  clearWeaponSilhouette(group);
 }
});
test('R4.5 M4 stock has iconic deep rear heel and birdcage markings',()=>{
 const {group}=model('ar-m4a1');
 assert.ok(bounds(group,'stock').min.y<-4.72,'M4 heel approaches grip height');
 assert.ok(has(group,'ar-birdcage'),'simple birdcage slits');
 assert.equal(group.children.filter(x=>x.name==='family-art-ar-birdcage').length,2);
 clearWeaponSilhouette(group);
});
test('R4.5 attachments retain same raised muzzle position as visual body',()=>{
 const {config,group}=model('ar-m4a1');
 const suppressed=setWeaponAttachment(config,'muzzle','muzzle-suppressor');
 const assembly=resolveWeaponAssembly(suppressed);
 const accessories=buildWeaponAccessories(suppressed,mat,mat);
 const box=new THREE.Box3().setFromObject(accessories);
 assert.ok(close(box.max.x,assembly.muzzleX));
 const suppressor=accessories.children.find(x=>x.geometry.type==='BoxGeometry'&&
  x.geometry.parameters.width>5);
 assert.ok(suppressor&&close(suppressor.position.y,assembly.muzzleY));
 clearWeaponSilhouette(group);clearWeaponSilhouette(accessories);
});
