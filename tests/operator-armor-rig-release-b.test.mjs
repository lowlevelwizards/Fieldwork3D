import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';
import {initialWardrobe,readWardrobe,resolvedWardrobe,wardrobeItemsForSlot}
 from '../src/operator-wardrobe-data.ts';
import {rigMagazineMount}
 from '../src/operator-armor-rig-silhouettes.ts';
const pose=(r,armor,rig,armorColor='olive-drab',rigColor='coyote')=>{
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',armor==='armor-bare'?'armor-none':
  armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 kit=setEquipmentChoice(kit,'rig',rig==='no-rig'?'rig-none':
  ['micro-rig','light-rig','chest-placard','chicom-rig','bandolier'].includes(rig)?
  'rig-light':'rig-full');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment:kit,wardrobe:{...initialWardrobe(),styles:{
   armorStyle:armor,rigStyle:rig,top:'bdu-shirt',trousers:'bdu-trousers'},
   fabricSolids:{armor:armorColor,gear:rigColor}}
 },0);
 return kit;
};
test('all curated options are selectable and retired overlapping cuts migrate',()=>{
 const armor=wardrobeItemsForSlot('armorStyle').map(x=>x.id);
 const rig=wardrobeItemsForSlot('rigStyle').map(x=>x.id);
 assert.equal(armor.length,9,'no more than eight distinct armor families plus no armor');
 assert.ok(armor.includes('soft-flak'));
 assert.ok(rig.includes('chicom-rig'));
 assert.ok(rig.includes('bandolier'));
 assert.ok(rig.includes('sadf-webbing'));
 assert.ok(!armor.includes('soft-paca'),'PACA alias no longer clutters selector');
 assert.ok(!rig.includes('belt-harness'),'duplicate webbing harness retired');
 const migrated=readWardrobe({version:1,styles:{
  armorStyle:'soft-paca',rigStyle:'belt-harness'}});
 assert.equal(migrated.styles.armorStyle,'soft-slick');
 assert.equal(migrated.styles.rigStyle,'field-webbing');
});
test('historic and minimal rig options remain cosmetic, preserve equipment class',()=>{
 const r=createOperatorRig('rook','blue');
 const k=pose(r,'soft-flak','chicom-rig');
 assert.equal(k.slots.armor,'armor-soft');
 assert.equal(k.slots.rig,'rig-light');
 assert.equal(r.visualKit.wardrobeGear.armor['soft-flak'].visible,true);
 assert.equal(r.visualKit.wardrobeGear.rig['chicom-rig'].visible,true);
 pose(r,'plate-standard','sadf-webbing');
 assert.equal(r.visualKit.wardrobeGear.rig['sadf-webbing'].visible,true);
 r.dispose();
});
test('magazine sockets follow distinctive rigs, separate fronts and side capacity',()=>{
 const simple=['chest-placard','micro-rig','light-rig','split-front',
  'chicom-rig','full-chest','sadf-webbing'];
 for(const id of simple){
  const one=rigMagazineMount(id,0,'plate-standard');
  const two=rigMagazineMount(id,1,'plate-standard');
  assert.notEqual(one.z,two.z,id+' front cells differ');
  assert.equal(one.rotation,0);
 }
 assert.notEqual(rigMagazineMount('chest-placard',0,'plate-standard').z,
  rigMagazineMount('split-front',0,'plate-standard').z,
  'plate-mounted 3-cell and split front carry different spacing');
 const a=rigMagazineMount('chest-placard',3,'plate-standard');
 assert.ok(Math.abs(a.rotation)>1,'4th magazine moves to physical side');
 const b=rigMagazineMount('chest-placard',0,'plate-legacy');
 const c=rigMagazineMount('chest-placard',0,'plate-jpc');
 assert.ok(b.x>c.x,'legacy carrier projects pouch farther than light carrier');
 assert.equal(rigMagazineMount('light-rig',0,'plate-standard',-1).z,
  -rigMagazineMount('light-rig',0,'plate-standard',1).z);
});
test('independent armor and rig colors do not leak into carrier webbing',()=>{
 const r=createOperatorRig('rook','blue');
 pose(r,'plate-standard','micro-rig','olive-drab','coyote');
 const armor=r.vestMaterial.color.clone();
 const gear=r.gearMaterial.color.clone();
 pose(r,'plate-standard','micro-rig','olive-drab','black');
 assert.ok(r.vestMaterial.color.equals(armor),'vest/pads inherit armor, not pouch');
 assert.ok(!r.gearMaterial.color.equals(gear),'rig fabric can change alone');
 const a=r.visualKit.wardrobeGear.rig['chest-placard'];
 const harness=a.children.find(x=>x.name==='standalone-harness');
 assert.ok(harness,'placard has physical optional shoulder/back harness');
 pose(r,'plate-standard','chest-placard');
 assert.equal(harness.visible,false,'plate provides mounting; standalone straps hidden');
 pose(r,'armor-bare','chest-placard');
 assert.equal(harness.visible,true,'no armor gets proper supporting harness');
 r.dispose();
});
