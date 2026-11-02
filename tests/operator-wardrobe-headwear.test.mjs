import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe,setWardrobeStyle} from '../src/operator-wardrobe-data.ts';
const pose=(equipment,wardrobe)=>({x:0,z:0,heading:0,velocity:0,
 seconds:0,stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
 down:false,surrender:false,aiming:false,firing:false,
 turning:0,deterministic:true,equipment,wardrobe});
test('wardrobe headgear and face accessories are mutually exclusive',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=initialEquipmentLoadout(),w=initialWardrobe();
 w=setWardrobeStyle(w,'headwear','high-cut-rails');
 w=setWardrobeStyle(w,'eyewear','goggles-up');
 w=setWardrobeStyle(w,'headset','helmet-ears');
 poseOperator(r,pose(kit,w),0);
 assert.equal(r.visualKit.helmet.visible,false);
 assert.equal(r.visualKit.wardrobeHead.headwear['high-cut-rails'].visible,true);
 assert.equal(r.visualKit.wardrobeHead.eyewear['goggles-up'].visible,true);
 assert.equal(r.visualKit.wardrobeHead.headset['helmet-ears'].visible,true);
 assert.equal(r.visualKit.hair.visible,false);
 kit=setEquipmentChoice(kit,'head','head-cap');
 w=setWardrobeStyle(w,'headwear','backwards-cap');
 poseOperator(r,pose(kit,w),0);
 assert.equal(r.visualKit.wardrobeHead.headwear['high-cut-rails'].visible,false);
 assert.equal(r.visualKit.wardrobeHead.headwear['backwards-cap'].visible,true);
 assert.equal(r.visualKit.helmet.visible,false);
 r.dispose();
});
