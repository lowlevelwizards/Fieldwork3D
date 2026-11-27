import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PARTS,FAMILY_PRESETS,readWeaponFamilyBuild,compatibleFamilyPart} from '../src/equipment-weapon-families.ts';
import {arsenalStockArtChoice} from '../src/arsenal/catalog.ts';
import {arStockArtKind} from '../src/weapons/geometry/ar-stock-caricature.ts';
import {buildModularWeaponSilhouette} from '../src/breach-modular-weapon-geometry.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
test('four artwork identities preserve existing recipe IDs and add MOE',()=>{
 const parts=Object.values(FAMILY_PARTS).filter(p=>p.family==='ar'&&p.slot==='stock');
 assert.equal(new Set(parts.map(p=>arsenalStockArtChoice(p.id))).size,4);
 assert.equal(new Set(parts.map(p=>arStockArtKind(p.id))).size,4);
 for(const p of FAMILY_PRESETS.filter(p=>p.family==='ar')){
  assert.deepEqual(readWeaponFamilyBuild({family:p.family,parts:p.parts},p.weapon)?.parts,p.parts);
 }
 assert.ok(compatibleFamilyPart('ar-flat','stock','ar-stock-moe','carbine'));
});
test('each authored miniature has one pad and adjustable variants have static art latch',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const host=FAMILY_PRESETS.find(p=>p.id==='ar-m4a1');
 for(const id of ['ar-fixed','ar-fixed-a2','ar-car','ar-stock-m4','ar-compact','ar-stock-moe']){
  const g=buildModularWeaponSilhouette({family:'ar',parts:{...host.parts,stock:id}},mat,mat);
  try{
   const pieces=g.children.filter(n=>n.name.startsWith('family-stock-'));
   assert.equal(pieces.filter(n=>n.userData.arStockCaricature).length,1);
   assert.equal(pieces.filter(n=>n.userData.arStockDecorativePad).length,1);
   assert.equal(pieces.filter(n=>n.userData.arStockDecorativeLatch).length,arStockArtKind(id)==='fixed'?0:1);
   assert.ok(pieces.length<=5);
   const pad=pieces.find(n=>n.userData.arStockDecorativePad);
   const body=pieces.find(n=>n.userData.arStockCaricature);
   assert.ok(new THREE.Box3().setFromObject(pad).intersectsBox(new THREE.Box3().setFromObject(body)),id+' pad seated in art');
   assert.equal(pieces.filter(n=>n.userData.arStockUpperMass).length,arStockArtKind(id)==='fixed'?0:1);
  }finally{clearWeaponSilhouette(g);}
 }
});

test('WC2.5c decorative upper silhouettes and pad hierarchy',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const host=FAMILY_PRESETS.find(p=>p.id==='ar-m4a1');
 const bounds=(g,tag)=>new THREE.Box3().setFromObject(g.children.find(n=>n.userData[tag]));
 const models=['ar-stock-m4','ar-compact','ar-stock-moe'].map(stock=>buildModularWeaponSilhouette({family:'ar',parts:{...host.parts,stock}},mat,mat));
 try{
  const [classic,sop,moe]=models;
  const size=(b)=>b.getSize(new THREE.Vector3());
  assert.ok(size(bounds(sop,'arStockDecorativePad')).x>size(bounds(classic,'arStockDecorativePad')).x,'SOPMOD pad visibly thicker');
  for(const g of [classic,sop]){
   const upper=bounds(g,'arStockUpperMass'),pad=bounds(g,'arStockDecorativePad');
   assert.ok(Math.abs(upper.max.y-pad.max.y)<.15,'flat upper silhouette and rear pad');
   assert.ok(bounds(g,'arStockDecorativeLatch').intersectsBox(bounds(g,'arStockCaricature')),'accent stays close to lower artwork');
  }
  assert.ok(bounds(moe,'arStockDecorativeLatch').intersectsBox(bounds(moe,'arStockUpperMass')),'MOE accent begins at upper artwork');
 }finally{for(const g of models)clearWeaponSilhouette(g);mat.dispose();}
});
