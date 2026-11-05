import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createM1956Waist,updateM1956Variant} from '../src/operator-m1956-webbing.ts';
import {M1956_VARIANTS,isM1956Variant} from '../src/operator-m1956-policy.ts';
import {initialWardrobe,readWardrobe,setWardrobeStyle,resolvedWardrobe}
 from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {createChestRigSilhouettes,updateFittedRigHarness,RIG_FRONT_PROFILES,
 RIG_MAGAZINE_MOUTHS} from '../src/operator-armor-rig-silhouettes.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';
test('R5G: M1956 stays rig-full and cosmetic variants round-trip',()=>{
 const kit=setEquipmentChoice(initialEquipmentLoadout('carbine'),'rig','rig-full');
 const w=setWardrobeStyle(initialWardrobe(),'rigStyle','m1956-lce');
 assert.equal(resolvedWardrobe(w,kit).rigStyle,'m1956-lce');
 assert.equal(kit.slots.rig,'rig-full');
 assert.deepEqual(M1956_VARIANTS,['early','late','light']);
 assert.equal(isM1956Variant('unsupported'),false);
 for(const m1956Variant of M1956_VARIANTS)
  assert.equal(readWardrobe({...w,m1956Variant}).m1956Variant,m1956Variant);
 assert.deepEqual(RIG_MAGAZINE_MOUTHS['m1956-lce'],[]);
 assert.ok(RIG_FRONT_PROFILES['m1956-lce']);
});
test('R5G: real-size cloth cases and field pack switch without rebuilding',()=>{
 const parent=new THREE.Group(),mat=new THREE.MeshStandardMaterial();
 const w=createM1956Waist(parent,mat,mat,mat,mat);
 assert.equal(w.root.visible,false);
 for(const section of [w.casesEarly,w.casesLate,w.canteenLeft,w.packEarly,w.packLate])
  assert.ok(section.children.length>0);
 for(const variant of M1956_VARIANTS){
  updateM1956Variant(w,variant);
  assert.equal(w.packEarly.visible,variant==='early');
  assert.equal(w.packLate.visible,variant==='late');
  assert.equal(w.canteenRight.visible,variant!=='light');
 }
});
test('R5G: fitted H suspension retains two rear legs and lower belt returns',()=>{
 const mat=new THREE.MeshStandardMaterial(),chest=new THREE.Group();
 const groups=createChestRigSilhouettes(chest,mat,mat,mat,mat,mat);
 updateFittedRigHarness(groups,'m1956-lce','bdu-shirt',
  rigContactFrame('armor-bare','bdu-shirt','m1956-lce'));
 const harness=groups['m1956-lce'].getObjectByName('uniform-fitted-rig-harness');
 assert.ok(harness);
 assert.equal(harness.children.filter(x=>x.name==='rig-lower-front-return').length,2);
 const bar=harness.children.find(x=>x.name==='m1956-rear-H-crossbar');
 assert.ok(bar instanceof THREE.Mesh,'physical transverse H strap');
 assert.ok(bar.geometry.getAttribute('position').count>=12);
});
