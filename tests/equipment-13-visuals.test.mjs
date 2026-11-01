import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';

const pose=(equipment,flashCharges=1)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment,flashCharges
});
test('optional gear exists on the canonical soldier rig with grounded attachments',()=>{
 const rig=createOperatorRig('rook','blue');
 const kit=initialEquipmentLoadout();
 poseOperator(rig,pose(kit),0);
 assert.equal(rig.rigPouches[0].visible,true);
 assert.equal(rig.rigPouches[1].visible,false);
 assert.equal(rig.beltPouch.visible,true);
 assert.equal(rig.medicalPouch.visible,true);
 assert.equal(rig.radioUnit.visible,true);
 assert.equal(rig.flashCanister.visible,true);
 assert.ok(rig.gloveCovers.every(x=>x.visible));
 rig.dispose();
});
test('loadout changes hide worn accessories; throwing consumes visible canister',()=>{
 const rig=createOperatorRig('rook','blue');
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'rig','rig-full');
 kit=setEquipmentChoice(kit,'medical','medical-none');
 kit=setEquipmentChoice(kit,'hands','hands-none');
 poseOperator(rig,pose(kit),0);
 assert.equal(rig.rigPouches[1].visible,true);
 assert.equal(rig.medicalPouch.visible,false);
 assert.ok(rig.gloveCovers.every(x=>!x.visible));
 poseOperator(rig,pose(kit,0),0);
 assert.equal(rig.flashCanister.visible,false);
 kit=setEquipmentChoice(kit,'rig','rig-none');
 kit=setEquipmentChoice(kit,'belt','belt-light');
 poseOperator(rig,pose(kit),0);
 assert.ok(rig.rigPouches.every(x=>!x.visible));
 assert.equal(rig.beltPouch.visible,false);
 rig.dispose();
});
