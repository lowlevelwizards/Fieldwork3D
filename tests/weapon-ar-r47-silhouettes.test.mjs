/** R4.7: focused visual-geometry corrections, not gameplay or firearm internals. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly,setWeaponAttachment,readWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {arMagazineCurve,arMagazinePolyLowerFacet}
 from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {AR_MUTED_FDE,AR_STANAG_RIB}
 from '../src/weapons/geometry/weapon-visual-palette.ts';
const basic=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const close=(a,b,e=.002)=>Math.abs(a-b)<=e;
const model=id=>{
 const p=FAMILY_PRESETS.find(p=>p.id===id);assert.ok(p,id);
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const g=buildWeaponSilhouette(p.weapon,basic,basic,c);
 g.updateMatrixWorld(true);
 return {p,c,g,a:resolveWeaponAssembly(c)};
};
const art=(g,type)=>g.children.find(x=>x.name==='family-art-'+type);
const part=(g,type)=>g.children.filter(x=>x.name.startsWith('family-'+type+'-'));
const bounds=(g,type)=>{
 const b=partVisualBounds(g,type);assert.ok(b,type);return b;
};
test('R4.7 all eight ARs keep authentic presets, attachments and muzzle X',()=>{
 const ids=FAMILY_PRESETS.filter(p=>p.family==='ar');
 assert.equal(ids.length,8);
 for(const p of ids){
  const {c,g,a}=model(p.id);
  assert.ok(g.children.length<=36,p.id+' compact mesh budget');
  assert.ok(bounds(g,'grip').intersectsBox(bounds(g,'receiver')));
  assert.ok(bounds(g,'magazine').intersectsBox(bounds(g,'receiver')));
  assert.ok(bounds(g,'handguard').intersectsBox(bounds(g,'barrel')));
  assert.ok(close(new THREE.Box3().setFromObject(g).max.x,a.muzzleX),p.id+' shot tip');
  assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(c)),p.weapon),c);
  clearWeaponSilhouette(g);
 }
});
test('R4.7 forward assist is one continuous, shallow extruded face',()=>{
 for(const id of ['ar-m16a1','ar-m16a2','ar-m4a1','ar-mk18']){
  const {g}=model(id);
  const assist=part(g,'receiver').filter(x=>x.userData.arForwardAssist);
  assert.equal(assist.length,1,id+' one solid face');
  assert.equal(assist[0].geometry.type,'ExtrudeGeometry');
  assert.ok(close(assist[0].position.z,1.91));
  const b=new THREE.Box3().setFromObject(assist[0]);
  assert.ok(b.max.x-b.min.x>2.3&&b.max.z-b.min.z<.30);
  assert.ok(b.max.x<-.65,'assist ends behind the ejection port');
  assert.ok(art(g,'ar-port'),'port still visible');
  clearWeaponSilhouette(g);
 }
});
test('R4.7 polymer seams never create bright horizontal crosshatches',()=>{
 for(const [id,mark] of [['ar-m16a2','poly-ribs'],['ar-car15','car-ribs']]){
  const {g}=model(id),plane=art(g,mark);
  assert.ok(plane,id+' has ribbed poly');
  const image=plane.material.map.image,[w,h]=[image.width,image.height];
  assert.ok(w>=24&&h>=8);
  const data=image.data,alpha=(x,y)=>data[(y*w+x)*4+3];
  assert.equal(alpha(5,Math.floor(h/2)),0,
   'no bright longitudinal seam between rib bands');
  assert.ok(alpha(3,Math.floor(h/2))>0,'rib bands retained');
  clearWeaponSilhouette(g);
 }
 const mk=model('ar-mk12mod0');
 const v=art(mk.g,'pri-vents');
 assert.ok(v,'PRI retains vents');
 assert.equal(v.material.map.image.data[(2*16+14)*4+3],0,
  'PRI has no illuminated full-length side underline');
 clearWeaponSilhouette(mk.g);
});
test('R4.7 curved metal STANAGs are still uniform, with delayed lower sweep',()=>{
 const c30=arMagazineCurve('30'),poly=arMagazineCurve('poly');
 assert.ok(c30.power>1.7&&c30.power<1.9);
 assert.ok(poly.power>1.7&&poly.power<1.9);
 assert.equal(arMagazinePolyLowerFacet(poly).length,4);
 const m4=model('ar-m4a1'),mk=model('ar-mk18');
 assert.equal(part(m4.g,'magazine').length,3);
 assert.ok(part(m4.g,'magazine').slice(1).every(x=>x.material===AR_STANAG_RIB));
 assert.equal(part(mk.g,'magazine').length,4);
 assert.ok(bounds(mk.g,'magazine').max.z-bounds(mk.g,'magazine').min.z<2,
  'polymer bevel remains shallow and does not overinflate sideways');
 assert.ok(part(mk.g,'magazine').some(x=>x.material===AR_MUTED_FDE));
 assert.equal(gatherOldPolyArt(mk.g),0,'no resurrected square panel');
 clearWeaponSilhouette(m4.g);clearWeaponSilhouette(mk.g);
});
function gatherOldPolyArt(g){
 return g.children.filter(x=>x.name==='family-art-ar-poly-panel').length;
}
test('R4.7 rails remain instanced; Mk12 bridge stays PRI-only',()=>{
 for(const id of ['ar-m16a4','ar-m4a1','ar-mk18']){
  const {g}=model(id),rails=g.children.filter(x=>x.userData.arRailTeeth);
  assert.equal(rails.length,2,id+' receiver and fore-end rails');
  assert.ok(rails.every(x=>x instanceof THREE.InstancedMesh));
  assert.ok(rails.some(x=>x.userData.arRailFourSided));
  clearWeaponSilhouette(g);
 }
 const mk=model('ar-mk12mod0');
 const bridge=mk.g.children.filter(x=>x.userData.arRailTeeth);
 assert.equal(bridge.length,2,'receiver and PRI bridge have separate top rails');
 assert.ok(bridge.every(x=>!x.userData.arRailFourSided),
  'Mk12 cannot inherit universal quad rails');
 clearWeaponSilhouette(mk.g);
});
test('R4.7 Mk18 rail reveals the nose, with no fixed A-frame',()=>{
 const {g,a}=model('ar-mk18');
 assert.ok(bounds(g,'handguard').max.x<13.55);
 assert.ok(a.muzzleX-bounds(g,'handguard').max.x>2.2);
 assert.equal(part(g,'barrel').filter(x=>x.geometry.type==='ExtrudeGeometry'&&
  x.geometry.parameters?.shapes?.holes?.length===1).length,0);
 clearWeaponSilhouette(g);
});
test('R4.7 canonical flash hiders use faceted six-sided bodies',()=>{
 for(const id of ['ar-m16a1','ar-m16a2','ar-m4a1','ar-mk18']){
  const {g,a,c}=model(id);
  const device=part(g,'barrel').find(x=>x.geometry.type==='CylinderGeometry'&&
   x.geometry.parameters.radialSegments===6);
  assert.ok(device,id+' symbolic six-sided muzzle');
  assert.ok(close(new THREE.Box3().setFromObject(g).max.x,a.muzzleX));
  assert.equal(g.children.filter(x=>x.name==='family-art-ar-birdcage').length,2);
  const replaced=setWeaponAttachment(c,'muzzle','muzzle-suppressor');
  const hidden=buildWeaponSilhouette(replaced.weapon,basic,basic,replaced);
  assert.equal(hidden.children.filter(x=>x.name==='family-art-ar-birdcage').length,0);
  clearWeaponSilhouette(hidden);clearWeaponSilhouette(g);
 }
});
test('R4.7 variant distinction and stock restraint',()=>{
 const car=model('ar-car15'),colt=model('ar-colt733'),m4=model('ar-m4a1');
 assert.ok(car.a.muzzleX>colt.a.muzzleX,'733 has the shorter front end');
 assert.notEqual(car.c.build.parts.magazine,colt.c.build.parts.magazine);
 assert.ok(bounds(m4.g,'stock').min.y>-4.4&&bounds(m4.g,'stock').min.y<-4.0,
  'M4 flat heel remains chunky without being a shovel');
 assert.ok(bounds(car.g,'stock').min.y>-3.1,'retro butt remains distinct');
 for(const v of [car,colt,m4])clearWeaponSilhouette(v.g);
});
