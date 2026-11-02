import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
const base={x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,aiming:false,
 firing:false,turning:0,deterministic:true,equipment:initialEquipmentLoadout()};
test('wardrobe choices switch authored garment details, knee pads and watch',()=>{
 const rig=createOperatorRig('rook','blue');
 let wardrobe=initialWardrobe();
 wardrobe=setWardrobeStyle(wardrobe,'top','flannel');
 wardrobe=setWardrobeStyle(wardrobe,'trousers','jeans');
 wardrobe=setWardrobeStyle(wardrobe,'knees','knee-hard');
 wardrobe=setWardrobeStyle(wardrobe,'wrist','wrist-nav');
 poseOperator(rig,{...base,wardrobe},0);
 const visual=rig.visualKit.wardrobeBody;
 assert.equal(visual.tops['flannel'].visible,true);
 assert.equal(visual.tops['acu-shirt'].visible,false);
 assert.equal(visual.trousers['jeans'].every(x=>x.visible),true);
 assert.equal(visual.knees['knee-hard'].every(x=>x.visible),true);
 assert.equal(visual.wrist['wrist-nav'].visible,true);
 assert.equal(rig.visualKit.jacket.visible,false);
 rig.dispose();
});
