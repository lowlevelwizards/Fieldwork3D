import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';

const RIGS=['micro-rig','chest-placard','light-rig','chicom-rig',
 'bandolier','field-webbing','lbv','full-chest','split-front','sadf-webbing'];

function equip(r,armor,rig,top='bdu-shirt'){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor',armor==='armor-bare'?
  'armor-none':armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig',
  ['micro-rig','chest-placard','light-rig','chicom-rig','bandolier'].includes(rig)?
  'rig-light':'rig-full');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:{...initialWardrobe(),styles:{
   top,trousers:'bdu-trousers',armorStyle:armor,rigStyle:rig,
   headwear:'bare',beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
}

test('Rig R2: each unarmored style has real front-to-rear suspension geometry',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const rig of RIGS){
   equip(r,'armor-bare',rig);
   const g=r.visualKit.wardrobeGear.rig[rig];
   const h=g.getObjectByName('uniform-fitted-rig-harness');
   assert.ok(h&&h.children.length>0,rig+' fitted suspension exists');
   const bb=new THREE.Box3().setFromObject(h);
   const dims=bb.getSize(new THREE.Vector3());
   assert.equal(bb.isEmpty(),false,rig+' has spatial geometry');
   assert.ok(bb.min.x<0&&bb.max.x>0,rig+' traverses front and back');
   assert.ok(dims.z>4.5&&dims.y>3,rig+' supports both sides of torso');
   const first=h.children.map(c=>c.uuid);
   equip(r,'armor-bare',rig);
   assert.deepEqual(h.children.map(c=>c.uuid),first,
    rig+' does not rebuild connectors on unchanged pose');
  }
 }finally{r.dispose();}
});

test('Rig R2: true placard mode only produces front mounting tabs',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  equip(r,'armor-bare','chest-placard');
  const g=r.visualKit.wardrobeGear.rig['chest-placard'];
  const h=g.getObjectByName('uniform-fitted-rig-harness');
  const before=new THREE.Box3().setFromObject(h);
  assert.ok(before.min.x<0,'standalone placard has a real rear harness');
  equip(r,'plate-standard','chest-placard');
  const f=rigContactFrame('plate-standard','bdu-shirt','chest-placard');
  assert.equal(f.mode,'carrier-placard');
  const now=new THREE.Box3().setFromObject(h);
  assert.ok(now.min.x>0,'carrier-mounted placard has no rear shoulder harness');
  assert.ok(h.children.length>0,'two carrier tabs are visible');
  const marker=g.getObjectByName('standalone-harness');
  assert.equal(marker?.visible,false,'independent harness mode hidden');
  equip(r,'soft-flak','chest-placard');
  assert.equal(rigContactFrame('soft-flak','bdu-shirt','chest-placard').mode,
   'external-harness');
  assert.ok(new THREE.Box3().setFromObject(h).min.x<0,
   'nonmodular flak uses independent rear harness');
 }finally{r.dispose();}
});

test('Rig R2: belt-first webbing and P83 keep separate moving hip loads',()=>{
 const r=createOperatorRig('rook','blue');
 try{
  for(const rig of ['field-webbing','sadf-webbing']){
   equip(r,'armor-bare',rig);
   const waist=r.visualKit.wardrobeGear.waistRig[rig];
   assert.equal(waist.parent,r.hip,rig+' waist lives on hip');
   assert.equal(waist.visible,true,rig+' waist visible');
   const chest=r.visualKit.wardrobeGear.rig[rig];
   assert.ok(chest.getObjectByName('uniform-fitted-rig-harness'));
  }
 }finally{r.dispose();}
});
