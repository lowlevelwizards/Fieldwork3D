import test from 'node:test';
import assert from 'node:assert/strict';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialArmorIntegrity} from '../src/equipment-armor.ts';
import {initialWardrobe,resolvedWardrobe} from '../src/operator-wardrobe-data.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
test('bump helmet adds choice without accidentally granting ballistic cover',()=>{
 const base=initialEquipmentLoadout();
 const bump=setEquipmentChoice(base,'head','head-bump');
 assert.equal(initialArmorIntegrity(bump).head,0);
 assert.equal(resolvedWardrobe(initialWardrobe(),bump).headwear,'bump-helmet');
 assert.equal(initialArmorIntegrity(base).head,5);
 const rig=createOperatorRig('rook','blue');
 poseOperator(rig,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,equipment:bump},0);
 assert.equal(rig.visualKit.wardrobeHead.headwear['bump-helmet'].visible,true);
 assert.equal(rig.visualKit.helmet.visible,false);
 rig.dispose();
});
