import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe,setWardrobePattern} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 equipment:initialEquipmentLoadout()};
test('four fabric channels accept independent 32px patterns without IK edits',()=>{
 const rig=createOperatorRig('rook','blue');
 const original=rig.feet.map(f=>f.anchor);
 let w=initialWardrobe();
 w=setWardrobePattern(w,'top','flecktarn');
 w=setWardrobePattern(w,'trousers','digital-woodland');
 w=setWardrobePattern(w,'pack','woodland');
 poseOperator(rig,{...base,wardrobe:w},0);
 assert.match(rig.clothMaterial.map.name,/flecktarn/);
 assert.match(rig.trouserMaterial.map.name,/digital-woodland/);
 assert.match(rig.packMaterial.map.name,/woodland/);
 assert.equal(rig.feet[0].anchor,original[0]);
 poseOperator(rig,{...base,wardrobe:initialWardrobe()},0);
 assert.doesNotMatch(rig.clothMaterial.map.name,/fieldwork-wardrobe/);
 rig.dispose();
});
