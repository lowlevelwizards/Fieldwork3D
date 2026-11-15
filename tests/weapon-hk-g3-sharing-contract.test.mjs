/** G3 style evolution must propagate to G3 variants, not all HK weapons.
 * Exterior shape contracts only; no gameplay or per-frame geometry changes.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
const s=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const make=id=>{
 const material=new THREE.MeshBasicMaterial();
 const c=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),id);
 const root=buildWeaponSilhouette('rifle',material,material,c);
 return {root,material,c};
};
const volume=m=>new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3()).toArray();
test('G3 core shell, lower, grip and magazine are shared by early, A3 and A4',()=>{
 const models=['hk-g3','hk-g3a3','hk-g3a4'].map(make);
 for(const slot of ['receiver','grip','magazine']){
  const shapes=models.map(({root,c})=>root.children.filter(m=>
   m.name.startsWith('family-'+slot+'-'+c.build.parts[slot]+'-')));
  assert.ok(shapes.every(a=>a.length>=1),slot+' appears in all three');
  // Compare major shell/grip/mag parts only; receiver contains variant sights.
  const volumes=shapes.map(a=>volume(a[0]));
  assert.deepEqual(volumes[0],volumes[1],slot+' first silhouette shared');
  assert.deepEqual(volumes[1],volumes[2],slot+' A3/A4 first silhouette shared');
 }
 const guards=models.map(({root})=>root.children.find(x=>
  x.name.startsWith('family-handguard-')&&x.geometry.type==='BufferGeometry'));
 assert.ok(guards.every(Boolean));
 assert.deepEqual(volume(guards[1]),volume(guards[2]),
  'G3A3 and G3A4 share polymer fore-end geometry');
 const sight=models.map(x=>x.root.children.find(m=>m.userData.hkRearSight));
 assert.deepEqual(sight.map(x=>x.userData.hkRearSight),
  ['early-leaf','diopter-drum','diopter-drum']);
 const stocks=models.map(x=>x.c.build.parts.stock);
 assert.deepEqual(stocks,['hk-g3-wood-stock','hk-g3-poly-stock','hk-g3-retract-stock']);
 for(const {root,material} of models){clearWeaponSilhouette(root);material.dispose();}
});
test('HK routing isolates G3 shell changes from HK33/HK53 and MP5 families',()=>{
 const code=s('src/weapons/geometry/hk-silhouettes.ts');
 assert.match(code,/parts\.receiver\.startsWith\('hk-mp5'\)/);
 assert.match(code,/addHKMP5Family\(root,build/);
 assert.match(code,/parts\.receiver==='hk33-556-rifle'\|\|parts\.receiver==='hk53-556-compact'/);
 assert.match(code,/addHK556Family\(root,build/);
 assert.match(code,/const parts=build\.parts,early=parts\.receiver==='hk-g3-early'/);
 assert.match(code,/const retract=parts\.stock==='hk-g3-retract-stock'/);
});
