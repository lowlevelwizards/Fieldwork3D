import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,aiming:false,
 firing:false,turning:0,deterministic:true,equipment:initialEquipmentLoadout()};
test('distinct carrier, rig, and pack assemblies follow real attachment nodes',()=>{
 const rig=createOperatorRig('rook','blue');
 let w=initialWardrobe();
 w=setWardrobeStyle(w,'armorStyle','soft-paca');
 w=setWardrobeStyle(w,'packStyle','medic-pack');
 w=setWardrobeStyle(w,'rigStyle','micro-rig');
 // A medic pack is a field-pack visual style: issue the compatible real item.
 poseOperator(rig,{...base,wardrobe:w,
  equipment:setEquipmentChoice(base.equipment,'backpack','backpack-field')},0);
 const style=rig.visualKit.wardrobeGear;
 assert.equal(style.armor['soft-paca'].visible,true);
 assert.equal(style.pack['medic-pack'].visible,true);
 assert.equal(style.pack['medic-pack'].parent,rig.pack);
 assert.equal(style.rig['micro-rig'].visible,true);
 assert.equal(style.rig['full-chest'].visible,false);
 rig.dispose();
});
