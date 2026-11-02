import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
const pose=(kit,wardrobe,heading=0)=>({x:11,z:21,heading,
 velocity:0,seconds:0,stride:0,posture:'stand',injury:0,
 weapon:'carbine',reload:0,reloadDuration:0,lastDoorAt:-100,
 lastThrowAt:-100,down:false,surrender:false,aiming:false,
 firing:false,turning:0,deterministic:true,unarmedPreview:true,
 equipment:kit,wardrobe});
test('one selectable shape at a time, including bare head, across headings',()=>{
 const r=createOperatorRig('rook','blue');
 let kit=bareLabEquipment(),w=initialWardrobe();
 for(const [id,expected] of [
  ['bare',0],['patrol-cap',1],['ach',1],['high-cut',1],['bare',0]
 ]){
  ({kit,wardrobe:w}=selectWardrobeItem(kit,w,'headwear',id));
  for(const heading of [0,Math.PI/2,Math.PI]){
   poseOperator(r,pose(kit,w,heading),0);
   const visible=Object.entries(r.visualKit.wardrobeHead.headwear)
    .filter(([,g])=>g.visible).map(([key])=>key);
   assert.deepEqual(visible,id==='bare'?[]:[id]);
   assert.equal(r.visualKit.helmet.visible,false);
   assert.equal(r.visualKit.cap.visible,false);
   assert.equal(r.helmetShell.some(x=>x.visible),false);
   assert.equal(r.visualKit.hair.visible,false);
   const chosen=r.visualKit.wardrobeHead.headwear[id];
   if(expected){
    assert.equal(chosen.parent,r.headCanonicalFrame);
    assert.ok(chosen.getWorldPosition(new THREE.Vector3())
      .toArray().every(Number.isFinite));
   }
  }
 }
 r.dispose();
});
test('a normal mission kit with no wardrobe saves still renders a single new ACH shell',()=>{
 const r=createOperatorRig('rook','blue');
 const kit=bareLabEquipment();
 const {setEquipmentChoice}=await import('../src/equipment-loadouts.ts');
 const helmet=setEquipmentChoice(kit,'head','head-helmet');
 poseOperator(r,pose(helmet,undefined),0);
 assert.equal(r.visualKit.wardrobeHead.headwear.ach.visible,true);
 assert.equal(r.visualKit.helmet.visible,false);
 r.dispose();
});
