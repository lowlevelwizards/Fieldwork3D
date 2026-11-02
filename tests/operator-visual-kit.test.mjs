import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const base=(equipment,magazineCarryLocations=[])=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,posture:'stand',
 injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment,magazineCarryLocations,appearanceSeed:10
});
test('new appearance layers honor protection and clothes while preserving rig anchors',()=>{
 const rig=createOperatorRig('rook','blue');
 let gear=initialEquipmentLoadout();
 const oldHead=rig.head.position.y;
 poseOperator(rig,base(gear),0);
 assert.equal(rig.visualKit.helmet.visible,true);
 assert.equal(rig.visualKit.plateCarrier.visible,false);
 assert.equal(rig.visualKit.jacket.visible,true);
 gear=setEquipmentChoice(gear,'head','head-none');
 gear=setEquipmentChoice(gear,'armor','armor-carrier');
 gear=setEquipmentChoice(gear,'top','top-light');
 poseOperator(rig,base(gear),0);
 assert.equal(rig.visualKit.helmet.visible,false);
 assert.equal(rig.visualKit.hair.visible,true);
 assert.equal(rig.visualKit.plateCarrier.visible,true);
 assert.equal(rig.visualKit.jacket.visible,false);
 assert.equal(rig.head.position.y,oldHead);
 rig.dispose();
});
test('spare magazines appear only at the ledger-specified carry location',()=>{
 const rig=createOperatorRig('rook','blue');
 const gear=initialEquipmentLoadout();
 poseOperator(rig,base(gear,['rig','rig','belt','backpack']),0);
 assert.equal(rig.visualKit.magazines.rig.filter(x=>x.visible).length,2);
 assert.equal(rig.visualKit.magazines.belt.filter(x=>x.visible).length,1);
 assert.equal(rig.visualKit.magazines.pocket.filter(x=>x.visible).length,0);
 poseOperator(rig,base(gear,[]),0);
 assert.ok(rig.visualKit.magazines.rig.every(x=>!x.visible));
 rig.dispose();
});
