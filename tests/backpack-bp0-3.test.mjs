import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {PACK_PROFILES,PACK_STYLES,LEGACY_PACK_STYLES,legacyPackEquipment,legacyPackStyles,quotePackMigration} from '../src/operator-backpack-catalog.ts';
import {packBox,packVolume,packWebbing,packZipper} from '../src/operator-backpack-geometry.ts';
import {fitPack,buildPackHarness,mountPackArtwork,PACK_PIVOT,defaultPackMount} from '../src/operator-backpack-fit.ts';
import {equipmentExterior} from '../src/operator-equipment-exterior.ts';
test('BP1 nine unique pack identities plus none; all legacy appearances resolve',()=>{
 assert.equal(PACK_STYLES.length,10);
 assert.equal(new Set(Object.values(PACK_PROFILES).map(p=>p.id)).size,10);
 for(const [id,styles] of Object.entries(LEGACY_PACK_STYLES)){
  assert.deepEqual(legacyPackStyles(id),styles);
  for(const style of styles)assert.equal(legacyPackEquipment(style),id);
 }
 assert.equal(legacyPackEquipment('bogus'),undefined);
 assert.equal(legacyPackEquipment('sling-bag'),undefined);
 assert.equal(legacyPackEquipment('duffel'),undefined);
 assert.equal(quotePackMigration('backpack-day','hydration',1,true).ok,false);
 assert.equal(quotePackMigration('backpack-day','admin-pack',0,false).ok,false);
 assert.equal(quotePackMigration('backpack-field','medic-pack',16,true).ok,false);
 assert.equal(quotePackMigration('backpack-field','duffel',16,true).style,'rucksack');
 assert.equal(quotePackMigration('backpack-field','day-pack',0,true).ok,false);
 assert.equal(quotePackMigration('backpack-day','day-pack',NaN,true).ok,false);
});
const materials=()=>({fabric:new THREE.MeshStandardMaterial(),trim:new THREE.MeshStandardMaterial(),dark:new THREE.MeshStandardMaterial()});
test('BP2 metric boxes, taper, webbing and zipper have finite geometry',()=>{
 const root=new THREE.Group(),m=materials();
 m.fabric.userData.fieldworkFabric=true;
 m.fabric.userData.fieldworkBakedEquipmentAO=true;
 packBox(root,'base',m.fabric,[0,0,0],[4,10,8]);
 const taper=packVolume(root,'taper',m.fabric,[0,0,0],[4,10,8],{topWidth:.6,topDepth:.8});
 const p=taper.geometry.getAttribute('position');
 const top=[];for(let i=0;i<p.count;i++)if(p.getY(i)>4.9)top.push(Math.abs(p.getZ(i)));
 assert.ok(Math.abs(Math.max(...top)-2.4)<1e-5);
 const strap=packWebbing(root,'strap',m.trim,[0,0,0],[3,4,0],1,.2,[0,0,1]);
 assert.ok(Math.abs(strap.geometry.parameters.height-5)<1e-6);
 packZipper(root,'zip',m,[0,0,0],[0,3,0],[1,0,0]);
 for(const mesh of root.children)for(const key of ['position','normal','uv']){
  const a=mesh.geometry.getAttribute(key);assert.ok(a&&a.array.every(Number.isFinite));
 }
 assert.throws(()=>packBox(root,'invalid',m.fabric,[0,0,0],[0,1,1]));
 assert.throws(()=>packWebbing(root,'invalid',m.trim,[0,0,0],[0,0,0],1,.2,[0,1,0]));
});
test('BP3 pack seat, harness symmetry and direct mount compatibility',()=>{
 const m=materials();
 for(const style of PACK_STYLES)for(const armor of ['armor-bare','soft-vest','plate-jpc','plate-standard','plate-heavy'])for(const top of ['combat-shirt','gorka-jacket']){
  const fit=fitPack(style,armor,'no-rig',top);
  if(!fit.compatible){assert.equal(style,'assault-panel');continue;}
  const root=new THREE.Group();mountPackArtwork(root,fit);
  assert.ok(root.position.toArray().every(Number.isFinite));
  if(style==='no-pack'){assert.equal(root.visible,false);continue;}
  assert.equal(root.visible,true);
  const spec=defaultPackMount(style);
  const exterior=equipmentExterior(armor,'no-rig',top);
  assert.ok(fit.center[0]+spec.bodyFaceX<=exterior.back(spec.centerY,0));
  assert.equal(fit.upperSeats.length,2);
  assert.ok(Math.abs(fit.upperSeats[0][2]+fit.upperSeats[1][2])<1e-6);
  assert.ok(Math.abs(root.position.x+PACK_PIVOT[0]-fit.center[0])<1e-6);
  if(fit.mode==='direct'){assert.equal(fit.spans.length,0);continue;}
  assert.equal(fit.spans.length,16);
  for(const span of fit.spans)assert.ok([...span.a,...span.b,...span.normal].every(Number.isFinite));
 }
 const harness=buildPackHarness(fitPack('day-pack','plate-standard','light-rig','combat-shirt'),m);
 assert.ok(harness.children.length>0);
 assert.equal(buildPackHarness(fitPack('assault-panel','armor-bare','no-rig','combat-shirt'),m).children.length,0);
});
