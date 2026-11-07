import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {measureVisibleStockContact}
 from '../src/breach-stock-contact-surface.ts';

const make=(id)=>{
  const preset=FAMILY_PRESETS.find(p=>p.id===id);
  assert.ok(preset,'Missing weapon fixture '+id);
  const config=selectWeaponFamilyPreset(
    initialWeaponConfiguration(preset.weapon),id);
  const steel=new THREE.MeshBasicMaterial();
  const dark=new THREE.MeshBasicMaterial();
  const root=buildWeaponSilhouette(preset.weapon,steel,dark,config);
  return {root,config};
};
test('visible modular stock contact is measured from actual stock geometry',()=>{
 for(const id of ['ar-m4a1','ak-akm','hk-g3a4','hk-mp5k-pdw']){
  const {root,config}=make(id);
  const contact=measureVisibleStockContact(root,config);
  assert.ok(contact,'No visible buttplate for '+id);
  assert.equal(contact.stockId,config.build.parts.stock);
  assert.ok(contact.rearX<0,'Rear face behind receiver: '+id);
  assert.ok(contact.maxY>contact.minY,'Contact height: '+id);
  assert.ok(contact.maxZ>contact.minZ,'Contact depth: '+id);
  assert.ok(Number.isFinite(contact.visualMinusAuthority),id);
  assert.deepEqual(contact.normal,[-1,0,0]);
  assert.deepEqual(root.userData.visibleStockContact,contact);
 }
});
test('visible stock measurement has stable results and never moves meshes',()=>{
 const {root,config}=make('hk-g3a4');
 const before=root.children.map(x=>x.position.toArray());
 const first=measureVisibleStockContact(root,config);
 const second=measureVisibleStockContact(root,config);
 assert.deepEqual(first,second);
 assert.deepEqual(root.children.map(x=>x.position.toArray()),before);
});
test('bare MP5K receiver is not misidentified as a shouldered stock',()=>{
 const preset=FAMILY_PRESETS.find(p=>p.parts.receiver==='hk-mp5k-stockless'&&
   p.parts.stock!=='hk-mp5k-pdw-stock');
 if(!preset)return;
 const {root,config}=make(preset.id);
 assert.equal(measureVisibleStockContact(root,config),null);
 assert.equal(root.userData.visibleStockContact,null);
});
