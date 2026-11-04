import test from 'node:test';
import assert from 'node:assert/strict';
import {rigContactFrame,RIG_PANEL_INNER_FACES}
 from '../src/operator-rig-contact-frame.ts';
import {ARMOR_FIT_TOPS} from '../src/operator-uniform-fit-envelope.ts';
import {armorMountedMagazineSocket} from '../src/operator-armor-attachment-frame.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

function pose(r,top,armor,rig){
 let equipment=initialEquipmentLoadout();
 equipment=setEquipmentChoice(equipment,'armor',armor==='armor-bare'?
  'armor-none':armor.startsWith('soft-')?'armor-soft':'armor-carrier');
 equipment=setEquipmentChoice(equipment,'rig',rig==='micro-rig'?
  'rig-light':'rig-light');
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
  equipment,wardrobe:{...initialWardrobe(),styles:{
   top,trousers:'bdu-trousers',armorStyle:armor,rigStyle:rig,
   beltStyle:'no-belt',packStyle:'no-pack',headwear:'bare'
  }}
 },0);
}
test('RIG-A micro and placard inner faces mount to the real selected underlayer',()=>{
 for(const top of ARMOR_FIT_TOPS){
  for(const armor of ['armor-bare','soft-vest','soft-flak','plate-slick',
    'plate-jpc','plate-standard','plate-heavy','plate-legacy']){
   for(const rig of ['micro-rig','chest-placard']){
    const f=rigContactFrame(armor,top,rig);
    const realInner=RIG_PANEL_INNER_FACES[rig]+f.rigShiftX;
    assert.ok(Math.abs(realInner-f.front.x-.14)<.0001,
     rig+'/'+armor+'/'+top+' actual rig inner face must land on exterior');
    assert.ok(f.sideRight.z>0&&f.shoulderRight.z>0);
    assert.ok(f.back.x<f.front.x);
    assert.equal(f.mode,rig==='chest-placard'&&
     ['plate-jpc','plate-standard','plate-heavy'].includes(armor)?
     'carrier-placard':'external-harness');
   }
  }
 }
});
test('RIG-A only compatible plate carriers remove placard harness',()=>{
 const r=createOperatorRig('rook','blue');
 const placard=r.visualKit.wardrobeGear.rig['chest-placard'];
 const harness=placard.getObjectByName('standalone-harness');
 assert.ok(harness);
 for(const armor of ['armor-bare','soft-vest','soft-flak','plate-slick',
   'plate-jpc','plate-standard','plate-heavy','plate-legacy']){
  pose(r,'combat-shirt',armor,'chest-placard');
  assert.equal(harness.visible,
   !['plate-jpc','plate-standard','plate-heavy'].includes(armor),
   armor+' detachable harness follows actual mounting capability');
  assert.ok(Math.abs(placard.position.x-
   rigContactFrame(armor,'combat-shirt','chest-placard').rigShiftX)<1e-6);
 }
 r.dispose();
});
test('RIG-A stable contact geometry and real magazine sockets track both rigs',()=>{
 const r=createOperatorRig('rook','blue');
 for(const rig of ['micro-rig','chest-placard']){
  const group=r.visualKit.wardrobeGear.rig[rig];
  for(const armor of ['armor-bare','plate-standard','plate-heavy']){
   pose(r,'bdu-shirt',armor,rig);
   const f=rigContactFrame(armor,'bdu-shirt',rig);
   assert.ok(Math.abs(group.position.x-f.rigShiftX)<1e-6);
   const h=group.getObjectByName('uniform-fitted-rig-harness');
   assert.ok(h&&h.children.length,'true-fitted shoulder and rear pieces exist');
   const before=h.children.map(c=>c.uuid);
   pose(r,'bdu-shirt',armor,rig);
   assert.deepEqual(h.children.map(c=>c.uuid),before,
    rig+' should not rebuild on every animation pose');
   const socket=armorMountedMagazineSocket(rig,0,armor,1,'bdu-shirt');
   const mouth=rig==='micro-rig'?8.93:9.20;
   assert.ok(Math.abs(socket.x-(f.rigShiftX+mouth))<.001,
    rig+' magazine remains seated in physical pouch');
  }
 }
 r.dispose();
});
