import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {rigContactFrame,RIG_PANEL_INNER_FACES}
 from '../src/operator-rig-contact-frame.ts';

function pose(r,armor,rig,posture='stand'){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor','armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-full');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture,injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:{...initialWardrobe(),styles:{
   top:'bdu-shirt',trousers:'bdu-trousers',
   armorStyle:armor,rigStyle:rig,headwear:'bare',
   beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
}
test('RIG-D physical field-webbing waist pouches and magazines follow the pelvis',()=>{
 const r=createOperatorRig('rook','blue');
 pose(r,'plate-standard','field-webbing');
 const waists=r.visualKit.wardrobeGear.waistRig;
 const waist=waists['field-webbing'];
 assert.equal(waist.parent,r.hip);
 assert.equal(waist.visible,true);
 assert.equal(waists['sadf-webbing'].visible,false);
 assert.equal(r.visualKit.wardrobeGear.rig['field-webbing'].parent,r.chest);
 const harness=r.visualKit.wardrobeGear.rig['field-webbing']
  .getObjectByName('uniform-fitted-rig-harness');
 assert.ok(harness&&harness.children.length);
 for(const m of r.visualKit.magazines.rig)
  assert.equal(m.parent,waist,'real magazines follow pelvis');
 pose(r,'plate-standard','field-webbing','crouch');
 assert.equal(waist.parent,r.hip);
 pose(r,'plate-standard','sadf-webbing');
 for(const m of r.visualKit.magazines.rig)
  assert.equal(m.parent,r.chest,'switching rig restores chest attachment');
 r.dispose();
});
test('RIG-D P83 Battle Jacket has own moving waist mass and wrapped torso silhouette',()=>{
 const r=createOperatorRig('rook','blue');
 pose(r,'plate-legacy','sadf-webbing');
 const waist=r.visualKit.wardrobeGear.waistRig['sadf-webbing'];
 assert.equal(waist.parent,r.hip);
 assert.equal(waist.visible,true);
 assert.equal(r.visualKit.wardrobeGear.waistRig['field-webbing'].visible,false);
 const chest=r.visualKit.wardrobeGear.rig['sadf-webbing'];
 const h=chest.getObjectByName('uniform-fitted-rig-harness');
 assert.ok(h&&h.children.length);
 const bb=new THREE.Box3().setFromObject(chest);
 assert.ok(bb.getSize(new THREE.Vector3()).x>10,
  'Battle Jacket must wrap back and sides, not be another placard');
 const f=rigContactFrame('plate-legacy','bdu-shirt','sadf-webbing');
 assert.ok(Math.abs(f.rigShiftX+RIG_PANEL_INNER_FACES['sadf-webbing']-
  f.front.x-.14)<.0001);
 pose(r,'plate-standard','field-webbing');
 assert.equal(waist.visible,false);
 r.dispose();
});
