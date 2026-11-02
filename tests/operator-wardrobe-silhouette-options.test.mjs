import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,aiming:false,
 firing:false,turning:0,deterministic:true,equipment:initialEquipmentLoadout()};
test('shorts and civilian short sleeves expose skin without skeleton edits',()=>{
 const rig=createOperatorRig('rook','blue');
 const bones=rig.feet.map(f=>f.lower.geometry);
 let w=initialWardrobe();
 w=setWardrobeStyle(w,'top','t-shirt');
 w=setWardrobeStyle(w,'trousers','shorts');
 w=setWardrobeStyle(w,'footwear','sneakers');
 w=setWardrobeStyle(w,'packStyle','assault-pack');
 poseOperator(rig,{...base,wardrobe:w},0);
 assert.ok(rig.arms.every(a=>a.lower.material===rig.skinMaterial));
 assert.ok(rig.feet.every(f=>f.lower.material===rig.skinMaterial));
 assert.equal(rig.visualKit.dayPack.scale.x,1.17);
 assert.ok(rig.visualKit.lightInstepPanels.every(x=>x.visible));
 assert.ok(rig.feet.every((f,i)=>f.lower.geometry===bones[i]));
 w=setWardrobeStyle(w,'top','field-jacket');
 w=setWardrobeStyle(w,'trousers','field-trousers');
 poseOperator(rig,{...base,wardrobe:w},0);
 assert.ok(rig.arms.every(a=>a.lower.material===rig.clothMaterial));
 assert.ok(rig.feet.every(f=>f.lower.material===rig.trouserMaterial));
 rig.dispose();
});
