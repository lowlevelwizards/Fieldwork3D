import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,aiming:false,
 firing:false,turning:0,deterministic:true,equipment:initialEquipmentLoadout()};
test('base mannequin, BDU and ACU show correct body coverage without skeleton edits',()=>{
 const rig=createOperatorRig('rook','blue');
 const bones=rig.feet.map(f=>f.lower.geometry);
 let w=initialWardrobe();
 w=setWardrobeStyle(w,'top','base-layer');
 w=setWardrobeStyle(w,'trousers','base-shorts');
 poseOperator(rig,{...base,wardrobe:w},0);
 assert.ok(rig.arms.every(a=>a.lower.material===rig.skinMaterial));
 assert.ok(rig.feet.every(f=>f.lower.material===rig.skinMaterial));
 w=setWardrobeStyle(w,'top','bdu-shirt');
 w=setWardrobeStyle(w,'trousers','bdu-trousers');
 poseOperator(rig,{...base,wardrobe:w},0);
 assert.ok(rig.arms.every(a=>a.lower.material===rig.clothMaterial));
 assert.ok(rig.feet.every(f=>f.lower.material===rig.trouserMaterial));
 assert.ok(rig.visualKit.fieldBlouses['bdu-shirt'].torso.visible);
 w=setWardrobeStyle(w,'top','acu-shirt');
 poseOperator(rig,{...base,wardrobe:w},0);
 assert.ok(rig.visualKit.fieldBlouses['acu-shirt'].torso.visible);
 assert.ok(rig.feet.every((f,i)=>f.lower.geometry===bones[i]));
 rig.dispose();
});