import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout,setEquipmentChoice} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {ARMOR_PROFILES} from '../src/operator-armor-rig-silhouettes.ts';

const size=(group)=>{
 group.updateMatrixWorld(true);
 return new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
};
const bounds=(group)=>{
 // The rig's +X-front local chest frame is yaw-rotated into world space.
 // Measure the authored surface relative to that local frame.
 group.updateMatrixWorld(true);
 const inverse=group.matrixWorld.clone().invert();
 const result=new THREE.Box3().makeEmpty();
 group.traverse(obj=>{
  if(!(obj instanceof THREE.Mesh))return;
  const localMatrix=inverse.clone().multiply(obj.matrixWorld);
  obj.geometry.computeBoundingBox();
  result.union(obj.geometry.boundingBox.clone().applyMatrix4(localMatrix));
 });
 return result;
};
const rayHits=(group,x,y,z,direction)=>{
 group.updateMatrixWorld(true);
 // Ray positions are authored in the chest local frame, then rotated
 // through the rig's canonical orientation before testing world meshes.
 const origin=group.localToWorld(new THREE.Vector3(x,y,z));
 const toward=new THREE.Vector3(...direction).transformDirection(group.matrixWorld);
 const ray=new THREE.Raycaster(origin,toward,0,80);
 return ray.intersectObject(group,true).length>0;
};
test('R1 armor is layered over or under the actual body, never a full chest cube',()=>{
 const r=createOperatorRig('rook','blue');
 const a=r.visualKit.wardrobeGear.armor;
 for(const id of ['soft-slick','soft-vest','soft-flak','plate-slick',
  'plate-jpc','plate-standard','plate-heavy','plate-legacy']){
  assert.ok(a[id].children.length>0,id+' authored mesh');
  assert.ok(Number.isFinite(bounds(a[id]).max.x),id+' finite geometry');
 }
 assert.ok(bounds(a['soft-slick']).max.x<=5.17,
  'concealed armor front stays UNDER the shirt front');
 assert.ok(size(a['plate-slick']).y<size(a['plate-standard']).y,
  'slick carrier exposes more of the torso vertically');
 assert.ok(size(a['plate-slick']).z<size(a['plate-standard']).z,
  'slick carrier narrower than standard');
 assert.ok(size(a['plate-jpc']).z<size(a['plate-standard']).z,
  'light carrier has reduced lateral coverage');
 assert.ok(size(a['plate-legacy']).y>size(a['plate-standard']).y+1.8,
  'legacy vest extends visibly lower and higher than modern bag');
 assert.ok(size(a['plate-heavy']).z>size(a['plate-standard']).z,
  'heavy carrier has projecting side plate components');
 r.dispose();
});
test('R1 skeletal side really has negative space, standard has solid cummerbund',()=>{
 const r=createOperatorRig('rook','blue');
 const a=r.visualKit.wardrobeGear.armor;
 assert.equal(rayHits(a['plate-jpc'],0,.18,18,[0,0,-1]),false,
  'light: open-air gap between skeletal rails');
 assert.equal(rayHits(a['plate-standard'],0,.18,18,[0,0,-1]),true,
  'standard: full cummerbund occupies same side opening');
 assert.equal(rayHits(a['plate-heavy'],0,-1,18,[0,0,-1]),true,
  'heavy: protective side plate');
 r.dispose();
});
test('R1 armor identities survive with no rig, no extra protection or magazines',()=>{
 const r=createOperatorRig('rook','blue');
 for(const [style,klass] of [
  ['armor-bare','armor-none'],['soft-slick','armor-soft'],
  ['soft-vest','armor-soft'],['soft-flak','armor-soft'],
  ['plate-slick','armor-carrier'],['plate-jpc','armor-carrier'],
  ['plate-standard','armor-carrier'],['plate-heavy','armor-carrier'],
  ['plate-legacy','armor-carrier']
 ]){
  let kit=initialEquipmentLoadout();
  kit=setEquipmentChoice(kit,'armor',klass);
  kit=setEquipmentChoice(kit,'rig','rig-none');
  poseOperator(r,{
   x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
   posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
   lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
   aiming:false,firing:false,turning:0,deterministic:true,
   unarmedPreview:true,equipment:kit,
   wardrobe:{...initialWardrobe(),styles:{
    armorStyle:style,rigStyle:'no-rig',top:'bdu-shirt',trousers:'bdu-trousers'
   }}
  },0);
  assert.equal(r.visualKit.wardrobeGear.armor[style].visible,true,style);
  assert.equal(r.visualKit.softArmor.visible,false);
  assert.equal(r.visualKit.plateCarrier.visible,false);
  assert.equal(kit.slots.armor,klass,'appearance cannot change protection');
  assert.ok(ARMOR_PROFILES[style].front>0,style+' mount profile');
 }
 r.dispose();
});
test('R1 final contrast separates police/flak and slick/light at actual kit scale',()=>{
 const r=createOperatorRig('rook','blue');
 const a=r.visualKit.wardrobeGear.armor;
 assert.ok(size(a['soft-flak']).y>size(a['soft-vest']).y+2,
  'padded raised collar and long flak body differ clearly from fitted police vest');
 assert.ok(size(a['plate-jpc']).z>size(a['plate-slick']).z+.75,
  'skeletonized plate carrier is visibly wider than minimalist slick');
 assert.ok(size(a['plate-heavy']).z>size(a['plate-standard']).z+.75,
  'heavy side armor adds meaningful lateral bulk');
 assert.ok(size(a['plate-slick']).y<size(a['plate-jpc']).y,
  'slick leaves a visibly shorter protected front');
 r.dispose();
});
