import test from 'node:test';
import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {bareLabEquipment} from '../src/operator-lab-baseline.ts';
import {selectWardrobeItem} from '../src/operator-wardrobe-unified.ts';
import {D2_FACE_SOLID_COLORS,D2_MASK_COLORS} from '../src/operator-head-accessory-catalog.ts';

const pose=(equipment,wardrobe,down=false)=>({
 x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,
 unarmedPreview:true,equipment,wardrobe
});
test('D2-R4 swatches survive the full pose ledger for every fabric family',()=>{
 const rig=createOperatorRig('rook','blue');
 const textile=rig.visualKit.wardrobeHead.faceFabric;
 for(const facewear of ['balaclava-one','balaclava-three','balaclava-open',
     'gaiter','shemagh','bandana']){
  const chosen=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'facewear',facewear);
  assert.equal(chosen.wardrobe.styles.facewear,facewear);
  for(const faceSolid of ['black','coyote','winter-white','olive']){
   const look=readWardrobe(JSON.parse(JSON.stringify({...chosen.wardrobe,d2FaceSolid:faceSolid})));
   assert.equal(look.d2FaceSolid,faceSolid);
   poseOperator(rig,pose(chosen.kit,look),0);
   assert.equal(textile.color.getHex(),D2_FACE_SOLID_COLORS[faceSolid].hex,facewear+' / '+faceSolid);
   assert.equal(rig.visualKit.wardrobeHead.faceFabric,textile);
  }
 }
 rig.dispose();
});
test('D2-R4 fabric tint and mask rubber are independent and downed effects reverse',()=>{
 const rig=createOperatorRig('rook','blue');
 const chosen=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'facewear','gaiter');
 const textile=rig.visualKit.wardrobeHead.faceFabric;
 const look=readWardrobe({...chosen.wardrobe,d2FaceSolid:'foliage'});
 poseOperator(rig,pose(chosen.kit,look),0);
 assert.equal(textile.color.getHex(),D2_FACE_SOLID_COLORS.foliage.hex);
 poseOperator(rig,pose(chosen.kit,look,true),0);
 assert.notEqual(textile.color.getHex(),D2_FACE_SOLID_COLORS.foliage.hex);
 poseOperator(rig,pose(chosen.kit,look),0);
 assert.equal(textile.color.getHex(),D2_FACE_SOLID_COLORS.foliage.hex);
 const mask=selectWardrobeItem(bareLabEquipment(),initialWardrobe(),'facewear','half-mask');
 for(const maskColor of ['black','olive','coyote']){
  const maskLook=readWardrobe({...mask.wardrobe,d2MaskColor:maskColor});
  poseOperator(rig,pose(mask.kit,maskLook),0);
  assert.equal(rig.visualKit.wardrobeHead.maskRubber.color.getHex(),D2_MASK_COLORS[maskColor].hex);
 }
 rig.dispose();
});
