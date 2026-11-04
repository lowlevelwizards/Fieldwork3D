import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Mask} from '../src/operator-d2-mask-visuals.ts';
import {readWardrobe,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {resolveD2HeadAssembly} from '../src/operator-head-accessory-catalog.ts';
const mat=new THREE.MeshStandardMaterial({color:0x343c36});
const materials={rubber:mat,hardware:mat,filters:mat,lens:mat};
test('GP-5 has full rubber hood and real central canister; M17 has internal cheek filters only',()=>{
 const gp=createD2Mask('gas-gp5',materials);
 const m17=createD2Mask('gas-m17',materials);
 for(const g of [gp,m17])assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
 assert.ok(gp.getObjectByName('hood-crown'));
 assert.ok(gp.getObjectByName('hood-back'));
 assert.ok(gp.getObjectByName('gp5-central-canister'));
 assert.ok(!gp.getObjectByName('head-harness-back'));
 const eyes=[];gp.traverse(x=>{if(x.name==='gp5-round-eye-lens')eyes.push(x);});
 assert.equal(eyes.length,2);
 const integrated=[];m17.traverse(x=>{if(x.name==='m17-integrated-cheek-filter')integrated.push(x);});
 assert.equal(integrated.length,2);
 assert.equal(m17.getObjectByName('m40-projecting-side-canister'),undefined);
});
test('full gas mask cosmetics suppress eye and boom visuals without changing real equipment',()=>{
 const old=readWardrobe({version:1,styles:{
  facewear:'gas-gp5',eyewear:'goggles-field',headset:'boom-headset'
 }});
 const kit=initialEquipmentLoadout();
 const visible=resolvedWardrobe(old,kit);
 assert.equal(visible.facewear,'gas-gp5');
 assert.equal(visible.eyewear,'eyes-none');
 assert.equal(old.styles.eyewear,'goggles-field');
 assert.equal(kit.slots.head,initialEquipmentLoadout().slots.head);
 const effective=resolveD2HeadAssembly({
  headwear:'bare',facewear:'gas-gp5',eyewear:'goggles-field',
  headset:'boom-headset'
 });
 assert.equal(effective.eyewear,'eyes-none');
 assert.equal(effective.headset,'comms-none');
 assert.equal(effective.hairCovered,true);
 assert.equal(effective.headwear,'bare','GP-5 hood hides helmet without altering saves');
 const hoodWithHeadset=resolveD2HeadAssembly({
  headwear:'ach',facewear:'gas-gp5',eyewear:'eyes-none',headset:'over-ear'
 });
 assert.equal(hoodWithHeadset.headset,'comms-none');
});
