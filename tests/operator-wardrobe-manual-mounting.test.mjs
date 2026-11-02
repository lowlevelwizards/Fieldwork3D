import test from 'node:test';
import assert from 'node:assert/strict';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true};
test('normalized manual mounts remain cosmetic and cannot move inventory',()=>{
 const saved=readWardrobe({version:1,mounts:{
  medical:'medical-rig-left',utility:'utility-belt-right',
  magazineOrder:'right-left'}});
 assert.equal(saved.mounts.medical,'medical-rig-left');
 assert.equal(saved.mounts.magazineOrder,'right-left');
 const bad=readWardrobe({version:1,mounts:{medical:'utility-pack-right'}});
 assert.equal(bad.mounts.medical,undefined);
 assert.equal(initialWardrobe().mounts.magazineOrder,'left-right');
 const rig=createOperatorRig('rook','blue');
 poseOperator(rig,{...base,equipment:initialEquipmentLoadout(),
  medicalCarryLocation:'rig',wardrobe:saved,
  magazineCarryLocations:['rig','rig']},0);
 assert.equal(rig.medicalPouch.parent,rig.chest);
 assert.ok(rig.medicalPouch.position.z<0);
 assert.ok(rig.visualKit.magazines.rig[0].position.z>0);
 rig.dispose();
});
