import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
const pose=equipment=>({x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment});
test('rear pack and belt fit preserve original motor anatomy',()=>{
 const rig=createOperatorRig('rook','blue');
 const kit=setEquipmentChoice(initialEquipmentLoadout(),'armor','armor-carrier');
 poseOperator(rig,pose(kit),0);
 assert.ok(rig.pack.position.x < -9);
 assert.equal(rig.pack.geometry.getAttribute('position'),undefined);
 assert.equal(rig.visualKit.plateCarrier.visible,true);
 const plateBack=rig.visualKit.plateCarrier.children[1];
 assert.ok(plateBack);
 assert.ok(Math.abs(rig.rigPouches[0].position.z)>7);
 poseOperator(rig,pose(setEquipmentChoice(kit,'belt','belt-light')),0);
 assert.equal(rig.visualKit.belt.visible,true);
 assert.ok(rig.visualKit.belt.scale.y<1);
 assert.ok(rig.feet.every(f=>Number.isFinite(f.anchor.x)));
 rig.dispose();
});
