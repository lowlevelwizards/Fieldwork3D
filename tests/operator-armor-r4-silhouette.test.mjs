import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ARMOR_ANATOMY,ARMOR_PROPORTIONS,ARMOR_VISIBLE_STYLES,
 armorGarmentLandmarks} from '../src/operator-armor-proportions.ts';
import {ARMOR_FIT_TOPS,fittedArmorSurfaces}
 from '../src/operator-uniform-fit-envelope.ts';
import {ARMOR_PROFILES} from '../src/operator-armor-rig-silhouettes.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {setEquipmentChoice,initialEquipmentLoadout}
 from '../src/equipment-loadouts.ts';

function pose(r,top,armor){
 let kit=initialEquipmentLoadout();
 kit=setEquipmentChoice(kit,'armor',
  armor.startsWith('plate-')?'armor-carrier':'armor-soft');
 kit=setEquipmentChoice(kit,'rig','rig-none');
 poseOperator(r,{
  x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,
  reloadDuration:0,lastDoorAt:-100,lastThrowAt:-100,
  down:false,surrender:false,aiming:false,firing:false,
  turning:0,deterministic:true,unarmedPreview:true,equipment:kit,
  wardrobe:{...initialWardrobe(),styles:{
   top,trousers:'bdu-trousers',headwear:'bare',
   armorStyle:armor,rigStyle:'no-rig',
   beltStyle:'no-belt',packStyle:'no-pack'
  }}
 },0);
 return kit;
}
function bounds(g){
 g.updateMatrixWorld(true);
 const inverse=g.matrixWorld.clone().invert();
 const box=new THREE.Box3().makeEmpty();
 g.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  o.geometry.computeBoundingBox();
  box.union(o.geometry.boundingBox.clone().applyMatrix4(
   inverse.clone().multiply(o.matrixWorld)));
 });
 return box;
}
test('R4 anatomy is stable and width/height hierarchy is intentional',()=>{
 assert.equal(ARMOR_ANATOMY.neckBase,7);
 assert.ok(ARMOR_ANATOMY.waist<ARMOR_ANATOMY.lowerRibs);
 assert.equal(ARMOR_VISIBLE_STYLES.length,7);
 for(const style of ARMOR_VISIBLE_STYLES){
  const a=ARMOR_PROPORTIONS[style];
  assert.ok(a.top<ARMOR_ANATOMY.neckBase);
  assert.ok(a.bottom>=-6.8);
  assert.ok(a.shoulderWidth>=1.5,style+' minimum readable yoke');
  assert.ok(a.width>=8.9&&a.width<=12.6,style+' proportional width');
 }
 assert.ok(ARMOR_PROPORTIONS['plate-slick'].width<
  ARMOR_PROPORTIONS['plate-jpc'].width);
 assert.ok(ARMOR_PROPORTIONS['plate-jpc'].width<
  ARMOR_PROPORTIONS['plate-standard'].width);
 assert.ok(ARMOR_PROPORTIONS['plate-standard'].width<
  ARMOR_PROPORTIONS['plate-heavy'].width);
 assert.ok(ARMOR_PROPORTIONS['soft-flak'].top-
  ARMOR_PROPORTIONS['soft-flak'].bottom>
  ARMOR_PROPORTIONS['soft-vest'].top-
  ARMOR_PROPORTIONS['soft-vest'].bottom+1.9);
});
test('R4 uses actual uniform landmarks across all five upper garments',()=>{
 for(const top of ARMOR_FIT_TOPS){
  const a=armorGarmentLandmarks(top);
  assert.ok(a.shoulderY>6.3);
  assert.ok(a.sternum.front>5);
  assert.ok(a.ribs.side>7);
  assert.ok(a.waist.y<=ARMOR_ANATOMY.waist+.01);
 }
});
test('R4 all 35 visible armor combinations retain authored bags and closed fitted wraps',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ARMOR_FIT_TOPS){
  for(const armor of ARMOR_VISIBLE_STYLES){
   const kit=pose(r,top,armor);
   const g=r.visualKit.wardrobeGear.armor[armor];
   const spec=ARMOR_PROPORTIONS[armor];
   const fit=fittedArmorSurfaces(armor,top,ARMOR_PROFILES[armor]);
   const front=g.getObjectByName('authored-front-bag');
   const back=g.getObjectByName('authored-rear-bag');
   const side=g.getObjectByName('uniform-fitted-connectors');
   assert.ok(g.visible,armor+' selected over '+top);
   assert.ok(front&&back&&side,armor+' has three distinct authored groups');
   const b=bounds(front),s=bounds(side);
   assert.ok(b.max.z-b.min.z>=spec.width-.1,
    armor+' '+top+' plate is legible at target width');
   assert.ok(b.max.z-b.min.z<=spec.width+1.2,
    armor+' '+top+' front plate not oversized by extras');
   assert.ok(s.max.z>=fit.side-.7&&s.min.z<=-fit.side+.7,
    armor+' '+top+' has connected flanks');
   assert.ok(s.max.y>=fit.shoulderY-.8,
    armor+' '+top+' shoulder reaches garment crown');
   assert.equal(kit.slots.armor,armor.startsWith('plate-')?
    'armor-carrier':'armor-soft');
   // No per-pose regeneration: same top reuses all connection meshes.
   const first=side.children.map(x=>x.uuid);
   pose(r,top,armor);
   assert.deepEqual(side.children.map(x=>x.uuid),first);
  }
 }
 r.dispose();
});
