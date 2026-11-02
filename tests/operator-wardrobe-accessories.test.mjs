import test from 'node:test';
import assert from 'node:assert/strict';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
test('optional empty carriers add no gameplay ability or capacity',()=>{
 const w=readWardrobe({version:1,accessories:{
  beltLeft:'empty-holster',beltRight:'empty-pouch',
  chest:'identification',pack:'bedroll'}});
 const kit=initialEquipmentLoadout(),before=JSON.stringify(kit);
 const rig=createOperatorRig('rook','blue');
 poseOperator(rig,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,
  reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,down:false,
  surrender:false,aiming:false,firing:false,turning:0,
  deterministic:true,wardrobe:w,equipment:kit},0);
 for(const [slot,id] of [
  ['beltLeft','empty-holster'],['beltRight','empty-pouch'],
  ['chest','identification'],['pack','bedroll']])
  assert.equal(rig.visualKit.accessories[slot][id].visible,true);
 assert.equal(JSON.stringify(kit),before);
 assert.deepEqual(readWardrobe({version:1,
  accessories:{beltLeft:'frag-grenade'}}).accessories.beltLeft,'none');
 assert.equal(initialWardrobe().accessories.chest,'none');
 rig.dispose();
});
