/** R4.6: authentic miniature silhouette, scale, instancing and contacts.
 * All checks are on actual game meshes, not independent illustrations.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly,setWeaponAttachment,readWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {weaponVisualLayout} from '../src/weapons/geometry/weapon-visual-layout.ts';
import {AR_STANAG_METAL,AR_STANAG_RIB,AR_MUTED_FDE}
 from '../src/weapons/geometry/weapon-visual-palette.ts';
import {arMagazineCurve,arMagazineOutline,arMagazineWidthPoints,
 arMagazineRibOutlines,arMagazinePolyBaseplate}
 from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {AR_BARREL_ART,AR_VISUAL_AXIS_Y,AR_FRONT_GUARD_ROOF_Y}
 from '../src/weapons/geometry/ar-barrel-profiles.ts';
const m=new THREE.MeshBasicMaterial();
const close=(x,y,e=.001)=>Math.abs(x-y)<=e;
function model(id){
 const p=FAMILY_PRESETS.find(p=>p.id===id);assert.ok(p,id);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const g=buildWeaponSilhouette(p.weapon,m,m,cfg);
 g.updateMatrixWorld(true);
 return {g,cfg,p,a:resolveWeaponAssembly(cfg)};
}
const box=(g,slot)=>partVisualBounds(g,slot);
const meshes=(g,slot)=>g.children.filter(x=>x.name.startsWith('family-'+slot+'-'));

test('R4.6 shared visual ID contract and authored stock contact geometry',()=>{
 assert.equal(FAMILY_PRESETS.filter(p=>p.family==='ar').length,8);
 assert.equal(FAMILY_PRESETS.length,17);
 assert.equal(Object.keys(FAMILY_PARTS).length,92);
 const a=model('ar-m16a1'),b=model('ar-m16a2');
 assert.ok(close(a.a.stockX,-13.74)&&close(b.a.stockX,-14.30));
 assert.ok(box(a.g,'stock').min.x> -14.1,'A1 is 20% shorter in stock section');
 assert.ok(box(b.g,'stock').min.x<box(a.g,'stock').min.x-.5,'A2 stays longer');
 assert.ok(box(a.g,'stock').min.y<-4.0,'shorter stock also taller');
 assert.ok(a.a.primaryX<-4.0&&a.a.primaryY>-3.2,'hand follows new grip');
 for(const v of [a,b]){
  assert.ok(box(v.g,'grip').intersectsBox(box(v.g,'receiver')));
  assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(v.cfg)),v.p.weapon),v.cfg);
  clearWeaponSilhouette(v.g);
 }
});
test('R4.6 curved STANAG widths are normal to shared centerline',()=>{
 for(const style of ['20','30','poly']){
  const c=arMagazineCurve(style),outline=arMagazineOutline(c);
  assert.equal(outline.length,10,'low-vertex family contour');
  for(const t of [0,.1,.3,.55,.8,1]){
   const pair=arMagazineWidthPoints(c,t);
   assert.ok(close(Math.hypot(pair[1][0]-pair[0][0],
    pair[1][1]-pair[0][1]),c.width,1e-6),
    style+' constant contour width');
  }
  assert.equal(arMagazineRibOutlines(c).length,style==='poly'?0:2);
 }
 assert.ok(arMagazineCurve('30').sweep<1.0,'STANAG is milder than AKM');
 assert.equal(arMagazinePolyBaseplate(arMagazineCurve('poly')).length,4);
});
test('R4.6 metal magazines use two thick actual ribs; polymer no fake side panel',()=>{
 for(const [id,expected] of [['ar-m16a1',3],['ar-m4a1',3],['ar-mk18',4]]){
  const {g}=model(id),mg=meshes(g,'magazine');
  assert.equal(mg.length,expected,id+' low-cost magazine geometry');
  if(id!=='ar-mk18')assert.equal(mg[0].material,AR_STANAG_METAL,
   id+' metal magazine body');
  assert.equal(g.children.filter(x=>x.name==='family-art-ar-poly-panel').length,0);
  if(id==='ar-mk18'){
   assert.ok(mg.some(x=>x.material===AR_MUTED_FDE),
    'heavy tan molded toe retained along with two restrained side facets');
  }else{
   assert.ok(mg.slice(1).every(x=>x.material===AR_STANAG_RIB),
    'contour-following matte ribs');
  }
  clearWeaponSilhouette(g);
 }
});
test('R4.6 receiver controls are seated and both stock and grips present',()=>{
 const {g}=model('ar-m4a1'),parts=meshes(g,'receiver');
 const cubes=parts.filter(x=>x.geometry.type==='BoxGeometry');
 assert.ok(cubes.some(x=>close(x.position.x,-5.92)&&
  close(x.position.y,1.59)&&close(x.geometry.parameters.height,.80)),
  'charging handle should be a seated substantial bar');
 const assist=parts.find(x=>x.userData.arForwardAssist);
 assert.ok(assist&&assist.geometry.type==='ExtrudeGeometry'&&
  close(assist.position.z,1.91),'one solid, shallow forward-assist profile');
 const port=g.children.find(x=>x.name==='family-art-ar-port');
 assert.ok(port&&close(port.geometry.parameters.width,3.28),'port larger');
 clearWeaponSilhouette(g);
});
test('R4.6 top rails are identical instanced segments on 4 faces',()=>{
 for(const id of ['ar-m16a4','ar-m4a1','ar-mk18']){
  const {g}=model(id);
  const rails=g.children.filter(x=>x.userData.arRailTeeth);
  assert.equal(rails.length,2,id+' receiver and handguard use shared rail grammar');
  const receiver=rails.find(x=>x.name.startsWith('family-receiver-'));
  const fore=rails.find(x=>x.name.startsWith('family-handguard-'));
  assert.ok(receiver instanceof THREE.InstancedMesh);
  assert.ok(fore instanceof THREE.InstancedMesh);
  assert.equal(receiver.count,3);
  assert.equal(fore.count,id==='ar-m16a4'?20:16);
  assert.equal(fore.userData.arRailFourSided,true);
  const b=box(g,'handguard');
  assert.ok(b.max.z>2.4,'actual tooth bounds used by workbench selection');
  clearWeaponSilhouette(g);
 }
});
test('R4.6 A1 vents and round ribs distinct; PRI tube stays unrailed',()=>{
 for(const [id,kind] of [
  ['ar-m16a1','a1-vents'],['ar-m16a2','poly-ribs'],
  ['ar-car15','car-ribs'],['ar-mk12mod0','pri-vents']]){
  const {g}=model(id);
  assert.ok(g.children.some(x=>x.name==='family-art-'+kind),id+' style mark');
  if(id==='ar-mk12mod0'){
   assert.ok(g.children.some(x=>x.geometry.type==='CylinderGeometry'&&
    x.geometry.parameters.radialSegments===6),'six-sided PRI tube');
   assert.equal(g.children.filter(x=>x.userData.arRailFourSided).length,0);
  }
  clearWeaponSilhouette(g);
 }
});
test('R4.6 front guards keep right vertical face, slanted back and intact muzzle',()=>{
 for(const id of ['ar-m16a1','ar-m16a2','ar-m16a4','ar-car15','ar-colt733','ar-m4a1']){
  const {g,cfg,a}=model(id);
  const sight=AR_BARREL_ART[cfg.build.parts.barrel].sightX;
  const frame=meshes(g,'barrel').find(x=>x.geometry.type==='ExtrudeGeometry'&&
   x.geometry.parameters.shapes?.holes?.length===1);
  assert.ok(frame,id+' genuine front opening');
  const bb=new THREE.Box3().setFromObject(frame);
  assert.ok(close(bb.min.x,sight-2.45),id+' strongly sloped rear');
  assert.ok(close(bb.max.x,sight+1.02),id+' vertical front');
  assert.ok(close(bb.max.y,AR_FRONT_GUARD_ROOF_Y));
  assert.ok(close(new THREE.Box3().setFromObject(g).max.x,a.muzzleX));
  clearWeaponSilhouette(g);
 }
});
test('R4.6 Mk18 tan grip and muzzle attachments replace factory silhouette',()=>{
 const mk=model('ar-mk18');
 assert.equal(mk.cfg.build.parts.grip,'ar-grip-poly-fde');
 assert.equal(meshes(mk.g,'grip')[0].material,AR_MUTED_FDE);
 const base=model('ar-m4a1');
 assert.equal(base.g.children.filter(x=>x.name==='family-art-ar-birdcage').length,2);
 const config=setWeaponAttachment(base.cfg,'muzzle','muzzle-suppressor');
 const suppressed=buildWeaponSilhouette(config.weapon,m,m,config);
 assert.equal(suppressed.children.filter(x=>x.name==='family-art-ar-birdcage').length,0,
  'factory tip hidden on replacement');
 assert.ok(close(new THREE.Box3().setFromObject(suppressed).max.x,base.a.muzzleX));
 for(const g of [mk.g,base.g,suppressed])clearWeaponSilhouette(g);
});
test('R4.6 common-scale AR/AK and workbench reference envelope',()=>{
 const ak=model('ak-akm'),m16=model('ar-m16a1');
 const m4=model('ar-m4a1'),mk18=model('ar-mk18');
 const len=v=>{const b=new THREE.Box3().setFromObject(v.g);
  return (b.max.x-b.min.x)*v.a.lengthScale};
 assert.ok(len(m16)>len(ak),'M16A1 retains long rifle identity');
 assert.ok(len(m4)>len(mk18),'Mk18 remains compact');
 for(const x of [m16,m4,mk18]){
  const l=weaponVisualLayout(x.cfg);
  assert.ok(close(l.workbenchCenterX,
   (x.a.muzzleX+x.a.stockX)/2*x.a.lengthScale));
 }
 const script=readFileSync(new URL('../scripts/audit-weapon-ortho-r2.mjs',import.meta.url),'utf8');
 assert.match(script,/getMatrixAt\(inst,instMatrix\)/,
  'orthographic report draws every real rail instance');
 for(const v of [ak,m16,m4,mk18])clearWeaponSilhouette(v.g);
});
