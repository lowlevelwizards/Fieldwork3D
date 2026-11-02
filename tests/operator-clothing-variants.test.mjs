import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const pose=(equipment,magazineCarryLocations=[])=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment,
 magazineCarryLocations
});
test('rolled light-shirt sleeves and cargo knees follow actual equipment choices',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=initialEquipmentLoadout();
 poseOperator(r,pose(kit),0);
 assert.ok(r.visualKit.rolledForearms.every(x=>!x.visible));
 assert.ok(r.visualKit.kneePanels.every(x=>x.visible));
 kit=setEquipmentChoice(kit,'top','top-light');
 kit=setEquipmentChoice(kit,'legs','legs-light');
 poseOperator(r,pose(kit),0);
 assert.ok(r.visualKit.rolledForearms.every(x=>x.visible));
 assert.ok(r.visualKit.rolledCuffs.every(x=>x.visible));
 assert.ok(r.visualKit.kneePanels.every(x=>!x.visible));
 r.dispose();
});
test('field webbing physically presents more rig magazines than light rig',()=>{
 const r=createOperatorRig('rook','blue');
 const kit=initialEquipmentLoadout();
 const mags=Array(7).fill('rig');
 poseOperator(r,pose(kit,mags),0);
 assert.equal(r.visualKit.magazines.rig.filter(x=>x.visible).length,4);
 const heavy=setEquipmentChoice(kit,'rig','rig-full');
 poseOperator(r,pose(heavy,mags),0);
 assert.equal(r.visualKit.magazines.rig.filter(x=>x.visible).length,7);
 r.dispose();
});
