import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const pose=(equipment,magazineCarryLocations=[])=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
 injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment,
 magazineCarryLocations});
test('backpack harness follows chest and disappears with the bag',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=initialEquipmentLoadout();
 poseOperator(r,pose(kit),0);
 assert.equal(r.visualKit.packHarness.parent,r.chest);
 assert.equal(r.visualKit.packHarness.visible,true);
 kit=setEquipmentChoice(kit,'backpack','backpack-none');
 poseOperator(r,pose(kit),0);
 assert.equal(r.pack.visible,false);
 assert.equal(r.visualKit.packHarness.visible,false);
 r.dispose();
});
test('SMG spares are visibly narrower and longer, without changing item placement',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=initialEquipmentLoadout();
 poseOperator(r,pose(kit,['rig']),0);
 const standard=r.visualKit.magazines.rig[0].scale.clone();
 kit=setEquipmentChoice(kit,'primary','primary-smg');
 poseOperator(r,{...pose(kit,['rig']),weapon:'smg'},0);
 assert.equal(r.visualKit.magazines.rig[0].visible,true);
 assert.ok(r.visualKit.magazines.rig[0].scale.x<standard.x);
 assert.ok(r.visualKit.magazines.rig[0].scale.y>standard.y);
 r.dispose();
});
