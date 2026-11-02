import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {setWardrobePattern,initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:initialEquipmentLoadout()};
test('head and load-bearing pattern selectors use independent real materials',()=>{
 const rig=createOperatorRig('rook','blue');
 let w=initialWardrobe();
 w=setWardrobePattern(w,'head','digital-woodland');
 w=setWardrobePattern(w,'gear','flecktarn');
 poseOperator(rig,{...base,wardrobe:w},0);
 assert.match(rig.headClothMaterial.map.name,/digital-woodland/);
 assert.match(rig.headArmorMaterial.map.name,/digital-woodland/);
 assert.match(rig.gearMaterial.map.name,/flecktarn/);
 assert.doesNotMatch(rig.clothMaterial.map.name,/fieldwork-wardrobe/);
 assert.doesNotMatch(rig.packMaterial.map.name,/fieldwork-wardrobe/);
 rig.dispose();
});
