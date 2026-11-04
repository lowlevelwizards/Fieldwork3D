import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {rigContactFrame,RIG_PANEL_INNER_FACES}
 from '../src/operator-rig-contact-frame.ts';
import {armorMountedMagazineSocket} from '../src/operator-armor-attachment-frame.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

const pose=(r,top,armor,rig)=>{
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor',armor==='armor-bare'?
  'armor-none':armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig','rig-light');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:{...initialWardrobe(),styles:{armorStyle:armor,
   rigStyle:rig,top,trousers:'bdu-trousers',headwear:'bare',
   beltStyle:'no-belt',packStyle:'no-pack'}}
 },0);
};
test('RIG-B three historic/light silhouettes have grounded underlayer-facing panel surfaces',()=>{
 for(const top of ['combat-shirt','bdu-shirt','acu-shirt','smock-jacket','gorka-jacket']){
  for(const armor of ['armor-bare','soft-flak','plate-standard','plate-heavy','plate-legacy']){
   for(const rig of ['light-rig','chicom-rig','bandolier']){
    const f=rigContactFrame(armor,top,rig);
    assert.ok(Math.abs(f.rigShiftX+RIG_PANEL_INNER_FACES[rig]-
     f.front.x-.14)<.0001,top+' '+armor+' '+rig);
    assert.equal(f.mode,'external-harness','historic harness stays outside its armor');
   }
  }
 }
});
test('RIG-B crossed X, old-school canvas and diagonal bands are fitted, cached and visually distinct',()=>{
 const r=createOperatorRig('rook','blue');
 const sizes=[];
 for(const rig of ['light-rig','chicom-rig','bandolier']){
  pose(r,'gorka-jacket','plate-legacy',rig);
  const group=r.visualKit.wardrobeGear.rig[rig];
  const harness=group.getObjectByName('uniform-fitted-rig-harness');
  assert.ok(harness&&harness.children.length>0,rig+' harness exists');
  const before=harness.children.map(x=>x.uuid);
  pose(r,'gorka-jacket','plate-legacy',rig);
  assert.deepEqual(harness.children.map(x=>x.uuid),before,
   rig+' stable geometry after repeated pose');
  const bounds=new THREE.Box3().setFromObject(group);
  sizes.push(bounds.getSize(new THREE.Vector3()).z);
  const front=rigContactFrame('plate-legacy','gorka-jacket',rig);
  assert.ok(Math.abs(group.position.x-front.rigShiftX)<1e-6);
 }
 assert.ok(sizes[0]>sizes[2],'four-pouch chest rig is broader than bandolier');
 r.dispose();
});
test('RIG-B physical magazine sockets sit on real fitted pouch mouths',()=>{
 for(const armor of ['armor-bare','plate-standard','soft-vest','plate-legacy']){
  for(const rig of ['light-rig','chicom-rig','bandolier']){
   const f=rigContactFrame(armor,'bdu-shirt',rig);
   const mouth=rig==='light-rig'?8.84:rig==='chicom-rig'?8.94:8.50;
   const s=armorMountedMagazineSocket(rig,0,armor,1,'bdu-shirt');
   assert.ok(Math.abs(s.x-(f.rigShiftX+mouth))<.001);
  }
 }
});
