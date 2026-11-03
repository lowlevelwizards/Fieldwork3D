import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe,setWardrobeFabricCamo,resolvedWardrobe}
 from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
const kit=initialEquipmentLoadout();
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,equipment:kit};
test('five approved authored cloth channels use separate real textures without touching IK',()=>{
 const rig=createOperatorRig('rook','blue');
 const original=rig.feet.map(f=>f.anchor);
 let w=initialWardrobe();
 const outfit=resolvedWardrobe(w,kit);
 for(const [channel,pattern] of [
  ['top','m81-woodland'],['trousers','three-color-desert'],
  ['armor','ucp'],['gear','multicam'],['pack','flecktarn']
 ])
  w=setWardrobeFabricCamo(w,channel,pattern,outfit);
 poseOperator(rig,{...base,wardrobe:w},0);
 for(const [channel,material] of [
  ['top',rig.clothMaterial],['trousers',rig.trouserMaterial],
  ['armor',rig.vestMaterial],['gear',rig.gearMaterial],['pack',rig.packMaterial]
 ])assert.match(material.map.name,new RegExp('Fieldwork cloth '+channel));
 assert.equal(rig.feet[0].anchor,original[0]);
 poseOperator(rig,{...base,wardrobe:initialWardrobe()},0);
 assert.doesNotMatch(rig.clothMaterial.map.name,/fieldwork-wardrobe/);
 rig.dispose();
});