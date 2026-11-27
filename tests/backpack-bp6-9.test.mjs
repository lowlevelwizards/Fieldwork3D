import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {AUTHORED_PACK_STYLES,buildAuthoredPack} from '../src/operator-backpack-art.ts';
import {PACK_PROFILES,legacyPackEquipment} from '../src/operator-backpack-catalog.ts';
import {createPackPreview,updatePackPreview} from '../src/operator-backpack-preview.ts';
import {fitPack} from '../src/operator-backpack-fit.ts';
import {solidChoicesFor} from '../src/operator-garment-color-policy.ts';
import {setWardrobeStyle,initialWardrobe,resolvedWardrobe,readWardrobe,setWardrobeFabricSolid} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const materials=()=>({fabric:new THREE.MeshStandardMaterial(),trim:new THREE.MeshStandardMaterial(),dark:new THREE.MeshStandardMaterial()});
test('nine authored models; distinct volumes, socket bounds and shared batch',()=>{
 assert.equal(AUTHORED_PACK_STYLES.length,9);
 const sizes=new Map(),caps={'field-pack':12,rucksack:12,'medic-pack':7,'comms-pack':8,'civilian-pack':4};
 let total=0;
 for(const style of AUTHORED_PACK_STYLES){
  const a=buildAuthoredPack(style,materials()),b=new THREE.Box3().setFromObject(a.root);
  sizes.set(style,b.getSize(new THREE.Vector3()));
  total+=a.root.userData.fieldworkPackComponents;
  assert.ok(a.root.children.length<=4);
  assert.ok(a.root.userData.fieldworkPackComponents<=(caps[style]??13));
  a.root.traverse(o=>{if(o.isMesh)for(const key of ['position','uv','normal'])assert.ok(o.geometry.getAttribute(key).array.every(Number.isFinite));});
  for(const socket of a.sockets)assert.ok(b.distanceToPoint(new THREE.Vector3(...socket.point))<.8,style+' '+socket.id);
 }
 assert.ok(total<=67);
 const a=sizes.get('field-pack'),b=sizes.get('rucksack'),c=sizes.get('medic-pack'),d=sizes.get('comms-pack');
 assert.ok(a.z>a.y*.9&&b.y>a.y&&b.z>a.z);
 assert.ok(c.z>d.z&&c.x<d.x);
 assert.ok(sizes.get('civilian-pack').y<sizes.get('day-pack').y);
});
test('load-bearing hips, optional medical graphic, radio metadata only',()=>{
 for(const style of ['field-pack','rucksack','medic-pack','comms-pack','civilian-pack']){
  const chest=new THREE.Group(),parent=new THREE.Group();chest.add(parent);
  const state=createPackPreview(parent,chest,materials());
  for(const [armor,rig,top] of [['armor-bare','no-rig','combat-shirt'],['plate-jpc','chest-placard','combat-shirt'],['plate-standard','full-chest','gorka-jacket']]){
   const art=updatePackPreview(state,true,style,armor,rig,top);
   assert.equal(art.style,style);assert.ok(art.root.visible&&state.harness);
   assert.equal(state.fit.waistSpans.length,style==='field-pack'||style==='rucksack'?6:0);
   state.harness.traverse(o=>{if(o.isMesh)assert.ok(o.geometry.getAttribute('position').array.every(Number.isFinite));});
  }
 }
 const marked=buildAuthoredPack('medic-pack',materials(),{medicalMark:true}),plain=buildAuthoredPack('medic-pack',materials(),{medicalMark:false});
 assert.ok(marked.root.userData.fieldworkPackGraphicTriangles>plain.root.userData.fieldworkPackGraphicTriangles);
 const comms=buildAuthoredPack('comms-pack',materials(),{antenna:false});
 assert.ok(comms.sockets.some(s=>s.kind==='antenna'));assert.ok(!comms.root.getObjectByName('radio-antenna-preview'));
});
test('civilian pack palette uses existing wardrobe channel; legacy slots stay authoritative',()=>{
 assert.equal(legacyPackEquipment('civilian-pack'),'backpack-day');
 const kit=setEquipmentChoice(initialEquipmentLoadout(),'backpack','backpack-day');
 let w=setWardrobeStyle(initialWardrobe(),'packStyle','civilian-pack');
 const look=resolvedWardrobe(w,kit);
 assert.equal(look.packStyle,'civilian-pack');
 assert.ok(solidChoicesFor('pack',look).includes('navy'));
 assert.ok(!solidChoicesFor('pack',{...look,packStyle:'field-pack'}).includes('navy'));
 w=setWardrobeFabricSolid(w,'pack','navy',look);
 assert.equal(readWardrobe(w).fabricSolids.pack,'navy');
 assert.equal(kit.slots.backpack,'backpack-day');
});
