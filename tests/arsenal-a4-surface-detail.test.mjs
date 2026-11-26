/** A4.8 focused art invariants: real factory builders, not proxy geometry. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {auditA4} from '../scripts/audit-arsenal-a4.mjs';
import {fncPixelAtlas} from '../src/weapons/geometry/fnc-pixel-details.ts';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';
const mat=new THREE.MeshBasicMaterial();
const make=id=>{
 const ref=ARSENAL_REFERENCES.find(x=>x.id===id);
 assert.ok(ref,'real factory preset '+id);
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),id);
 return buildWeaponSilhouette(c.weapon,mat,mat,c);
};
const detail=(g,n)=>g.children.filter(x=>x.name==='family-art-'+n);
const bounds=m=>new THREE.Box3().setFromObject(m);
const fire=(m,origin,direction)=>new THREE.Raycaster(
 new THREE.Vector3(...origin),new THREE.Vector3(...direction),0,12
).intersectObject(m).length;

test('A4 census covers active factory configurations and reuses shared texture identities',()=>{
 const a=auditA4();
 assert.equal(a.schema,'fieldwork-arsenal-a4');
 assert.equal(a.totals.presets,ARSENAL_REFERENCES.length);
 assert.equal(new Set(a.factoryPresets.map(x=>x.id)).size,ARSENAL_REFERENCES.length);
 assert.ok(a.totals.markMeshes>0&&a.totals.textureBytesEstimated>0);
 // A4's 11-map/114-overlay snapshot was for an older catalog. Verify
 // actual cross-owner texture identity reuse, not a stale global cap.
 const first=new Set(),second=new Set();
 for(const ref of ARSENAL_REFERENCES){
  const a=make(ref.id),b=make(ref.id);
  try{
   const collect=(root,set)=>root.traverse(n=>{if(n instanceof THREE.Mesh)for(const m of Array.isArray(n.material)?n.material:[n.material])if(m.map)set.add(m.map);});
   collect(a,first);collect(b,second);
  }finally{clearWeaponSilhouette(a);clearWeaponSilhouette(b);}
 }
 assert.ok(first.size>0);assert.deepEqual(first,second,'all factory maps reused across independent owners');
 assert.deepEqual(auditA4().totals,a.totals,'repeat census has stable resource counts');
});
test('A4 pixel mark palette is lit, shared, correctly oriented and never ghosted',()=>{
 const a=make('ar-m4a1'),b=make('ak-ak74m'),
  c=make('hk-g3a3');
 const marks=[...a.children,...b.children,...c.children]
  .filter(m=>m.userData.weaponPixelArt&&m.material.map);
 assert.ok(marks.length>=5);
 for(const m of marks){
  assert.ok(m.material instanceof THREE.MeshStandardMaterial,m.name+' lit PBR');
  assert.equal(m.material.side,THREE.FrontSide,'no backface ghosting');
  assert.equal(m.material.depthWrite,false,'preserve receiver depth');
  assert.equal(m.material.transparent,true);
  assert.equal(visualMaterialRole(m.material),'paint');
  assert.equal(m.material.map.magFilter,THREE.NearestFilter);
  assert.equal(m.material.map.minFilter,THREE.NearestFilter);
  assert.equal(m.material.map.colorSpace,THREE.SRGBColorSpace);
  assert.ok(!m.castShadow&&!m.receiveShadow);
 }
 const newer=make('ar-m4a1');
 assert.strictEqual(detail(a,'ar-port')[0].material,
  detail(newer,'ar-port')[0].material,
  'marks share app-lifetime finishes across owner builds');
 assert.notStrictEqual(detail(a,'ar-port')[0].geometry,
  detail(newer,'ar-port')[0].geometry,
  'owner geometry is independently disposable');
 for(const g of [a,b,c,newer])clearWeaponSilhouette(g);
});
test('A4 AK receiver stamp remains readable on both actual facing sides in one mesh',()=>{
 const g=make('ak-ak74m'),stamp=detail(g,'ak-receiver-stamp');
 assert.equal(stamp.length,1);
 const m=stamp[0],bb=bounds(m);
 assert.deepEqual(m.userData.surfaceDetailSides,['right','left']);
 assert.ok(bb.min.z<0&&bb.max.z>0);
 assert.equal(m.geometry.getIndex().count/3,4,'two quads');
 assert.ok(fire(m,[-1.08,-1.55,5],[0,0,-1])>0,'right side faces out');
 assert.ok(fire(m,[-1.08,-1.55,-5],[0,0,1])>0,'left side faces out');
 clearWeaponSilhouette(g);
});
test('A4 AR paired PRI vent art is one true two-sided graphic without losing details',()=>{
 const g=make('ar-mk12mod0'),v=detail(g,'pri-vents');
 assert.equal(v.length,1);
 assert.equal(v[0].geometry.getIndex().count/3,4);
 assert.deepEqual(v[0].userData.surfaceDetailSides,['right','left']);
 assert.ok(bounds(v[0]).min.z<0&&bounds(v[0]).max.z>0);
 clearWeaponSilhouette(g);
});
test('A4 HK selector retains separate face-specific safe/fire labels and real levers',()=>{
 for(const [id,kind,levers] of [
  ['hk-g3a3','sef',1],['hk-mp5a3','pictogram',2]
 ]){
  const g=make(id),labels=g.children.filter(m=>m.userData.hkSelectorMarkings);
  assert.equal(labels.length,2,id);
  assert.ok(labels.every(m=>m.material instanceof THREE.MeshStandardMaterial));
  assert.ok(labels.every(m=>m.userData.surfaceDetailClass==='hk-fire-mode-identity'));
  assert.ok(labels.some(m=>m.userData.surfaceDetailFace==='right'));
  assert.ok(labels.some(m=>m.userData.surfaceDetailFace==='left'));
  assert.equal(g.children.filter(m=>m.userData.hkSelectorLever).length,levers);
  assert.ok(labels.every(m=>m.userData.hkSelectorMarkings===kind));
  clearWeaponSilhouette(g);
 }
});
test('A4 FAL keeps substantial silhouette and one already batched muzzle-port surface',()=>{
 const g=make('fal-5000');
 const p=g.children.filter(m=>m.userData.falMuzzleSlots);
 assert.equal(p.length,1);
 assert.equal(p[0].userData.surfaceDetailFace,'both');
 assert.equal(p[0].userData.surfaceDetailClass,'fal-muzzle-ports');
 assert.equal(p[0].geometry.getIndex().count/3,4);
 clearWeaponSilhouette(g);
});
test('A4 FNC retains native-lit atlas and zero independent receiver/fore-end decals',()=>{
 const first=make('fnc-service'),second=make('fnc-service');
 const f=g=>g.children.filter(m=>m.userData.fncPixelDetailRegion);
 assert.equal(f(first).length,4);
 assert.equal(f(second).length,4);
 for(const m of f(first)){
  assert.equal(m.userData.surfaceDetailClass,'fnc-integrated-atlas');
  assert.strictEqual(m.material.map,fncPixelAtlas());
  assert.ok(m.geometry.getAttribute('uv'));
 }
 assert.ok(!first.children.some(x=>x.userData.weaponPixelArt),
  'FNC pixel ink stays integrated into four solid surfaces');
 assert.strictEqual(f(first)[0].material,f(second)[0].material,
  'mapped material shared across owners');
 clearWeaponSilhouette(first);clearWeaponSilhouette(second);
});
