import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {setWardrobeFabricCamo,initialWardrobe,resolvedWardrobe}
 from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const kit=initialEquipmentLoadout();
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment:kit};
test('approved headwear camo and separate gear print never share procedural channels',()=>{
 const rig=createOperatorRig('rook','blue');
 let w={...initialWardrobe(),headwearCamo:'m81-woodland'};
 w=setWardrobeFabricCamo(w,'gear','multicam',resolvedWardrobe(w,kit));
 poseOperator(rig,{...base,wardrobe:w},0);
 assert.match(rig.gearMaterial.map.name,/Fieldwork cloth gear/);
 assert.doesNotMatch(rig.clothMaterial.map.name,/fieldwork-wardrobe/);
 assert.doesNotMatch(rig.packMaterial.map.name,/fieldwork-wardrobe/);
 assert.doesNotMatch(rig.headClothMaterial.map.name,/Fieldwork cloth gear/);
 assert.doesNotMatch(rig.headArmorMaterial.map.name,/Fieldwork cloth gear/);
 rig.dispose();
});