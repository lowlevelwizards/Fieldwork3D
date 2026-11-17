/** M3.0C4: live shared-builder rollout gate for exact validated factories. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARSENAL_REFERENCES} from '../src/arsenal/catalog.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,setWeaponAttachment,readWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories}
 from '../src/breach-weapon-accessories.ts';
import {partVisualBounds,workbenchVisualAnchors}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {measureVisibleStockContact}
 from '../src/breach-stock-contact-surface.ts';
import {measureWeaponVisual} from '../scripts/audit-weapon-production-m30.mjs';
import {VERIFIED_RIGID_FACTORY_IDS}
 from '../src/weapons/geometry/validated-factory-rigid-compile.ts';

const slots=['receiver','barrel','handguard','stock','grip','magazine'];
const expected={'ak-akms':11,'ak-aks74u':11,'ar-m4a1':8};
const load=id=>{
 const ref=ARSENAL_REFERENCES.find(x=>x.id===id);
 assert.ok(ref,id+' reference');
 return selectWeaponFamilyPreset(initialWeaponConfiguration(ref.legacy.weapon),id);
};
const points=b=>[...b.min.toArray(),...b.max.toArray()];
const near=(a,b,label,t=.0001)=>{
 assert.ok(a&&b,label+' box exists');
 for(let i=0;i<6;i++)
  assert.ok(Math.abs(points(a)[i]-points(b)[i])<=t,
   label+' bound '+i+' drift');
};
const anchorsNear=(actual,expected,label)=>{
 assert.deepEqual(actual.map(x=>[x.slot,x.name]),
  expected.map(x=>[x.slot,x.name]),label+' slot identity');
 for(let i=0;i<actual.length;i++)
  for(const axis of ['x','y','z'])
   assert.ok(Math.abs(actual[i][axis]-expected[i][axis])<.0001,
    label+' '+actual[i].slot+' '+axis+' changed');
};
const draw=(config,options)=>buildWeaponSilhouette(
 config.weapon,new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial(),
 config,options);
const childMag=g=>g.children.filter(o=>o.name.startsWith('family-magazine-'));

test('M3.0C4 factory-only live builder saves exactly C3-proven GPU submissions',()=>{
 assert.deepEqual([...VERIFIED_RIGID_FACTORY_IDS].sort(),Object.keys(expected).sort());
 for(const id of VERIFIED_RIGID_FACTORY_IDS){
  const config=load(id),saved=JSON.stringify(config);
  const original=draw(config,{rigidCompilation:'disabled'});
  const live=draw(config);
  try{
   const report=live.userData.rigidCompilation;
   assert.equal(report.factoryId,id);
   assert.equal(report.avoidedSubmissions,expected[id]);
   const before=measureWeaponVisual(original),after=measureWeaponVisual(live);
   assert.equal(before.submissions-after.submissions,expected[id]);
   assert.equal(before.triangles,after.triangles,id+' triangle parity');
   near(new THREE.Box3().setFromObject(original),
    new THREE.Box3().setFromObject(live),id+' whole geometry');
   for(const slot of slots){
    near(partVisualBounds(original,slot),partVisualBounds(live,slot),
     id+' '+slot);
    assert.ok(live.children.some(x=>x.name.startsWith('family-'+slot+'-')),
     id+' lost Workbench pickability for '+slot);
   }
   assert.deepEqual(childMag(live).map(x=>x.name),
    childMag(original).map(x=>x.name));
   assert.equal(JSON.stringify(config),saved,'save/part recipe mutated');
   anchorsNear(workbenchVisualAnchors(config,live,'body'),
    workbenchVisualAnchors(config,original,'body'),id+' body');
   assert.deepEqual(live.userData.visibleStockContact,
    original.userData.visibleStockContact,'buttplate art datum changed');
   const contact=measureVisibleStockContact(live,config);
   assert.ok(contact&&Math.abs(contact.rearX-
    original.userData.visibleStockContact.rearX)<.0001,
    'merged factory stock must still measure same shoulder contact');
   // Standalone raycasts target real geometry, not synthetic slot labels.
   for(const slot of ['receiver','handguard','stock']){
    const obj=live.children.find(x=>x.name.startsWith('family-'+slot+'-')
     &&x instanceof THREE.Mesh);
    assert.ok(obj,id+' lost '+slot+' mesh');
    obj.updateWorldMatrix(true,false);
    const bounds=new THREE.Box3().setFromObject(obj);
    const mid=bounds.getCenter(new THREE.Vector3());
    const origin=mid.clone().add(new THREE.Vector3(0,0,30));
    const ray=new THREE.Raycaster(origin,new THREE.Vector3(0,0,-1));
    assert.ok(ray.intersectObject(obj,false).length,
     id+' lost real raycast '+slot);
   }
   const magazine=childMag(live);
   const first=magazine[0];
   first.visible=false;assert.equal(first.visible,false);
   first.visible=true;assert.equal(first.visible,true);
   assert.ok(live.children.includes(first),
    'reload must toggle original owned magazine mesh');
  }finally{
   const liveMeshes=live.children.filter(x=>x instanceof THREE.Mesh);
   const geometries=liveMeshes.map(x=>x.geometry);
   const disposals=new Set();
   for(const geometry of geometries)
    geometry.addEventListener('dispose',()=>disposals.add(geometry));
   clearWeaponSilhouette(live);
   assert.equal(disposals.size,new Set(geometries).size,
    'every committed live geometry must be disposed on rig swap');
   clearWeaponSilhouette(original);
  }
 }
});

test('M3.0C4 false-positive prevention: no fallback, no altered parts, no other factory',()=>{
 const factory=load('ar-m4a1');
 let altered=setConfiguredFamilyPart(factory,'magazine','ar-magpoly');
 assert.equal(altered.build.parts.magazine,'ar-magpoly');
 const baseline=load('ar-m16a2');
 for(const [label,config,options] of [
  ['changed-magazine',altered,undefined],
  ['non-allowlisted factory',baseline,undefined],
  ['explicit diagnostic opt-out',factory,{rigidCompilation:'disabled'}]
 ]){
  const body=draw(config,options);
  assert.equal(body.userData.rigidCompilation,undefined,label);
  clearWeaponSilhouette(body);
 }
 const material=new THREE.MeshBasicMaterial();
 for(const weapon of ['rifle','carbine','smg']){
  const g=buildWeaponSilhouette(weapon,material,material);
  assert.equal(g.userData.rigidCompilation,undefined,
   'legacy tier fallback must not secretly compile');
  clearWeaponSilhouette(g);
 }
 material.dispose();
 const restored=setConfiguredFamilyPart(altered,'magazine','ar-mag30');
 assert.deepEqual(restored.build,factory.build);
 const rebuilt=draw(restored);
 assert.equal(rebuilt.userData.rigidCompilation.factoryId,'ar-m4a1');
 clearWeaponSilhouette(rebuilt);
 assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(altered)),
  altered.weapon),altered,'altered Campaign save remains lossless');
});

test('M3.0C4 attachment swaps preserve exact body/optic sockets and replay-style roundtrips',()=>{
 let config=load('ar-m4a1');
 const sample=[config];
 for(const [slot,id] of [
  ['optic','optic-reflex'],['foregrip','foregrip-vertical'],
  ['light','light-compact'],['muzzle','muzzle-suppressor']]){
  const next=setWeaponAttachment(config,slot,id);
  assert.equal(next.slots[slot],id,'factory mounting rejected '+id);
  config=next;sample.push(config);
 }
 for(const raw of sample){
  const replay=readWeaponConfiguration(JSON.parse(JSON.stringify(raw)),raw.weapon);
  const original=draw(replay,{rigidCompilation:'disabled'});
  const live=draw(replay);
  const a=buildWeaponAccessories(replay,new THREE.MeshBasicMaterial(),
   new THREE.MeshBasicMaterial());
  const b=buildWeaponAccessories(replay,new THREE.MeshBasicMaterial(),
   new THREE.MeshBasicMaterial());
  try{
   assert.equal(live.userData.rigidCompilation.factoryId,'ar-m4a1',
    'static body compilation must survive valid accessory changes');
   anchorsNear(workbenchVisualAnchors(replay,live,'attachments'),
    workbenchVisualAnchors(replay,original,'attachments'),
    'mounted '+replay.build.parts.receiver);
   assert.deepEqual(measureWeaponVisual(a),measureWeaponVisual(b));
   assert.deepEqual(childMag(live).map(m=>m.name),
    childMag(original).map(m=>m.name));
   const saved=measureWeaponVisual(original).submissions-
    measureWeaponVisual(live).submissions;
   assert.equal(saved,live.userData.rigidCompilation.avoidedSubmissions,
    'actual submitted geometry must agree with compiler report');
   assert.ok(saved>=5&&saved<=8,'unexpected attachment-dependent saving');
   if(replay.slots.muzzle==='muzzle-bare')assert.equal(saved,8,
    'bare factory M4A1 must retain its C3-proven saving');
  }finally{
   clearWeaponSilhouette(original);clearWeaponSilhouette(live);
   clearWeaponSilhouette(a);clearWeaponSilhouette(b);
  }
 }
});
