import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {TILE_WORLD_SIZE} from '../src/rendering/pixel-materials.ts';

const kit=initialEquipmentLoadout();
const pose=(r,top,trousers,sleeveState='unrolled',trouserHem='unbloused',
 solids={top:'ranger-green',trousers:'khaki'})=>poseOperator(r,{
 x:0,z:0,heading:0,velocity:0,seconds:.25,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
 equipment:kit,
 wardrobe:{...initialWardrobe(),styles:{top,trousers},
  sleeveState,trouserHem,fabricSolids:solids}
},0);
const maximumY=mesh=>{
 const g=mesh.geometry;
 g.computeBoundingBox();
 return g.boundingBox.max.y;
};
const metricFaceV=mesh=>mesh.geometry.getAttribute('uv').getY(0);

test('all animated limbs use real physical texel density, not 1-unit IK UVs',()=>{
 const r=createOperatorRig('rook','blue');
 assert.equal(r.arms[0].upper.userData.garmentMetricLength,10);
 assert.equal(r.arms[0].lower.userData.garmentMetricLength,10);
 assert.equal(r.feet[0].upper.userData.garmentMetricLength,11.25);
 assert.equal(r.feet[0].lower.userData.garmentMetricLength,11.25);
 assert.ok(Math.abs(metricFaceV(r.arms[0].upper)-10/TILE_WORLD_SIZE)<1e-5);
 assert.ok(Math.abs(metricFaceV(r.feet[0].lower)-11.25/TILE_WORLD_SIZE)<1e-5);
 assert.equal(r.visualKit.fieldTrousers['bdu-trousers'].thigh[0]
  .userData.garmentMetricLength,11.25);
 assert.equal(r.visualKit.fieldBlouses['acu-shirt'].upper[0]
  .userData.garmentMetricLength,10);
 r.dispose();
});

test('hem finishes genuinely shorten fabric above boot while keeping IK nodes stable',()=>{
 const r=createOperatorRig('rook','blue');
 const original=r.feet[0].anchor;
 pose(r,'bdu-shirt','bdu-trousers','unrolled','unbloused');
 assert.ok(Math.abs(maximumY(r.feet[0].lower)-.5)<1e-5);
 assert.equal(r.feet[0].lower.userData.garmentBootShaft.visible,false);
 pose(r,'bdu-shirt','bdu-trousers','unrolled','bloused');
 assert.ok(Math.abs(maximumY(r.feet[0].lower)-.20)<1e-5);
 assert.equal(r.feet[0].lower.userData.garmentBootShaft.visible,true);
 pose(r,'bdu-shirt','bdu-trousers','unrolled','cuffed');
 assert.ok(Math.abs(maximumY(r.feet[0].lower)-.24)<1e-5);
 assert.strictEqual(r.feet[0].anchor,original,'IK contact anchor unchanged');
 for(const hem of ['unbloused','bloused','cuffed']){
  const obj=r.visualKit.fieldTrousers['bdu-trousers'][hem][0];
  pose(r,'bdu-shirt','bdu-trousers','unrolled',hem);
  assert.equal(obj.visible,true,hem+' visible');
 }
 r.dispose();
});

test('rolls shorten the upper sleeve and all jackets respect cuff and rolled states',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ['bdu-shirt','acu-shirt','combat-shirt','smock-jacket','gorka-jacket']){
  pose(r,top,'gorka-trousers','rolled','bloused');
  assert.ok(Math.abs(maximumY(r.arms[0].upper)-.15)<1e-5,top);
  const model=['bdu-shirt','acu-shirt'].includes(top)?
   r.visualKit.fieldBlouses[top]:r.visualKit.newUpper.cuts[top];
  assert.ok(model.rolledUpper.every(g=>g.visible),top+' roll geometry');
  pose(r,top,'gorka-trousers','cuffed','cuffed');
  assert.ok(Math.abs(maximumY(r.arms[0].upper)-.5)<1e-5,top);
  assert.ok(model.cuffedLower.every(g=>g.visible),top+' shortened forearm');
  assert.equal(r.visualKit.fieldTrousers['gorka-trousers'].suspenders.visible,false,
   'suspenders cannot show through any outer shirt or jacket');
 }
 r.dispose();
});

test('changing jacket solid does not change trouser material or knit body swatch',()=>{
 const r=createOperatorRig('rook','blue');
 pose(r,'combat-shirt','acu-trousers','unrolled','cuffed',
  {top:'olive-drab',trousers:'khaki'});
 const originalLeg=r.trouserMaterial.color.clone();
 const originalKnit=r.visualKit.newUpper.combatKnit.color.clone();
 pose(r,'combat-shirt','acu-trousers','unrolled','cuffed',
  {top:'coyote',trousers:'khaki'});
 assert.ok(r.trouserMaterial.color.equals(originalLeg));
 assert.ok(r.visualKit.newUpper.combatKnit.color.equals(originalKnit));
 r.dispose();
});
