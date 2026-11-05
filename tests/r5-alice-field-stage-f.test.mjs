import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ALICE_LC2_LOADS,isAliceLc2Load} from '../src/operator-alice-lc2-policy.ts';
import {createAliceLc2Waist,updateAliceLc2Load}
 from '../src/operator-alice-lc2-webbing.ts';
import {createWardrobeGearLayers,updateWardrobeGearLayers}
 from '../src/operator-wardrobe-gear-visuals.ts';
import {RIG_FRONT_PROFILES,RIG_MAGAZINE_MOUTHS}
 from '../src/operator-armor-rig-silhouettes.ts';
import {RIG_VISUAL_TEXTILES,validRigPrint,validRigSolid}
 from '../src/operator-rig-authenticity-policy.ts';
import {readWardrobe,initialWardrobe,setWardrobeStyle,
 resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

test('R5F: dedicated ALICE style is waist-first, not a copy of PLCE or a chest slab',()=>{
 assert.ok(RIG_FRONT_PROFILES['alice-lc2']);
 assert.deepEqual(RIG_MAGAZINE_MOUTHS['alice-lc2'],[]);
 assert.equal(RIG_VISUAL_TEXTILES['alice-lc2'].signature.solid,'olive-drab');
 assert.equal(validRigPrint('alice-lc2','m81-woodland'),false);
 assert.equal(validRigSolid('alice-lc2','olive-drab'),true);
});
test('R5F: all three equipment silhouettes share the original mechanical rig class',()=>{
 assert.deepEqual(ALICE_LC2_LOADS,['light','standard','patrol']);
 assert.equal(isAliceLc2Load('random'),false);
 const kit=setEquipmentChoice(initialEquipmentLoadout('carbine'),'rig','rig-full');
 const w=setWardrobeStyle(initialWardrobe(),'rigStyle','alice-lc2');
 assert.equal(resolvedWardrobe(w,kit).rigStyle,'alice-lc2');
 for(const load of ALICE_LC2_LOADS){
  const parsed=readWardrobe({...w,aliceLoad:load});
  assert.equal(parsed.aliceLoad,load);
  assert.equal(kit.slots.rig,'rig-full');
 }
});
test('R5F: visual belt carries unique real-size flap pouches, canteen covers and a rear patrol load',()=>{
 const parent=new THREE.Group();
 const nylon=new THREE.MeshStandardMaterial();
 const pouch=nylon.clone(),webbing=nylon.clone(),hardware=nylon.clone();
 const v=createAliceLc2Waist(parent,nylon,pouch,webbing,hardware);
 assert.equal(parent.children.includes(v.root),true);
 assert.equal(v.root.visible,false);
 assert.ok(v.magazineCases.children.length>=2);
 assert.ok(v.canteens.children.length>=2);
 updateAliceLc2Load(v,'light');
 assert.equal(v.canteens.visible,false);
 assert.equal(v.rearPack.visible,false);
 updateAliceLc2Load(v,'patrol');
 assert.equal(v.magazineCases.visible,true);
 assert.equal(v.canteens.visible,true);
 assert.equal(v.rearPack.visible,true);
});
test('R5F: fitted wardrobe gear lazily constructs only the selected ALICE waist',()=>{
 const chest=new THREE.Group(),hip=new THREE.Group();
 const pack=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),new THREE.MeshStandardMaterial());
 const materials=Array.from({length:5},()=>new THREE.MeshStandardMaterial());
 const v=createWardrobeGearLayers(chest,hip,pack,...materials,true);
 assert.equal(v.aliceWaist,undefined);
 updateWardrobeGearLayers(v,'armor-bare','alice-lc2','plain-belt','no-pack','bdu-shirt','light');
 assert.ok(v.aliceWaist);
 assert.equal(v.waistRig['alice-lc2'].visible,true);
 assert.equal(v.aliceWaist.load,'light');
 updateWardrobeGearLayers(v,'armor-bare','no-rig','plain-belt','no-pack','bdu-shirt','light');
 assert.equal(v.waistRig['alice-lc2'].visible,false);
});
