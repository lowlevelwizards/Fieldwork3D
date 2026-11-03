import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {ARMOR_PROFILES,rigMagazineMount} from '../src/operator-armor-rig-silhouettes.ts';
import {armorAttachmentFrame,armorMountedMagazineSocket}
 from '../src/operator-armor-attachment-frame.ts';

test('every wearable provides one canonical front, side, shoulder and rear mount',()=>{
 for(const id of Object.keys(ARMOR_PROFILES)){
  const f=armorAttachmentFrame(id);
  assert.ok(f.front.x>0,id+' front');
  assert.ok(f.back.x<0,id+' rear');
  assert.equal(f.sideLeft.z,-f.sideRight.z,id+' symmetric sides');
  assert.equal(f.shoulderLeft.z,-f.shoulderRight.z,id+' symmetric shoulders');
  assert.ok(f.sideRight.z>0,id+' positive side outside');
  assert.ok(Math.abs(f.rigShiftX-(
    f.front.x-ARMOR_PROFILES['plate-standard'].front+f.standOff))<1e-8,
    id+' correct profile shift');
 }
});
test('real carried magazine sockets follow exactly the same armor surface',()=>{
 for(const armor of ['armor-bare','soft-slick','soft-vest','soft-flak',
  'plate-slick','plate-jpc','plate-standard','plate-heavy','plate-legacy']){
  for(const rig of ['chest-placard','micro-rig','light-rig','split-front']){
   const frame=armorAttachmentFrame(armor);
   const base=rigMagazineMount(rig,0,armor,1);
   const mounted=armorMountedMagazineSocket(rig,0,armor,1);
   assert.equal(mounted.x,base.x+
    (frame.front.x-ARMOR_PROFILES[armor].front)+frame.standOff,
    rig+' '+armor+' shares the fitted front surface');
   assert.equal(mounted.y,base.y,'same rig pouch row');
   assert.equal(mounted.z,base.z,'same pouch bank');
   const side=armorMountedMagazineSocket(rig,6,armor);
   assert.ok(Math.abs(side.rotation)>1,'issued overflow remains on side');
  }
 }
});
test('changing armor silhouette moves rig and issued magazines without changing loadout',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor','armor-carrier');
 kit=setEquipmentChoice(kit,'rig','rig-light');
 for(const armor of ['plate-slick','plate-jpc','plate-standard',
  'plate-heavy','plate-legacy']){
  poseOperator(r,{
   x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
   injury:0,weapon:'carbine',reload:0,reloadDuration:0,
   lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
   aiming:false,firing:false,turning:0,deterministic:true,
   unarmedPreview:true,equipment:kit,
   wardrobe:{...initialWardrobe(),styles:{
    armorStyle:armor,rigStyle:'micro-rig',top:'bdu-shirt',
    trousers:'bdu-trousers'
   }}
  },0);
  const frame=armorAttachmentFrame(armor,'bdu-shirt');
  assert.equal(r.visualKit.wardrobeGear.rig['micro-rig'].position.x,
   frame.rigShiftX);
  assert.equal(r.visualKit.magazines.rig[0].position.x,
   armorMountedMagazineSocket('micro-rig',0,armor,1,'bdu-shirt').x);
  assert.equal(kit.slots.armor,'armor-carrier');
  assert.equal(kit.slots.rig,'rig-light');
 }
 r.dispose();
});