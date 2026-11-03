import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {TILE_WORLD_SIZE} from '../src/rendering/pixel-materials.ts';
import {garmentSolidHex} from '../src/operator-garment-color-policy.ts';
import {FIELD_TROUSER_PROFILES} from '../src/operator-field-trouser-prototypes.ts';

const kit=initialEquipmentLoadout();
const pose=(r,top,trousers,sleeveState='unrolled',trouserHem='unbloused',
 solids={top:'ranger-green',trousers:'khaki'},cuffSolid)=>poseOperator(r,{
 x:0,z:0,heading:0,velocity:0,seconds:.25,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
 lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,deterministic:true,unarmedPreview:true,
 equipment:kit,
 wardrobe:{...initialWardrobe(),styles:{top,trousers},
  sleeveState,trouserHem,fabricSolids:solids,
  ...(cuffSolid?{cuffSolid}:{})}
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

test('rolled sleeves preserve the full elbow and hide every shoulder pocket',()=>{
 const r=createOperatorRig('rook','blue');
 for(const top of ['bdu-shirt','acu-shirt','combat-shirt','smock-jacket','gorka-jacket']){
  pose(r,top,'gorka-trousers','unrolled','bloused');
  const fullUpper=r.arms[0].upper.geometry;
  pose(r,top,'gorka-trousers','rolled','bloused');
  assert.strictEqual(r.arms[0].upper.geometry,fullUpper,top+' upper arm must not shorten');
  assert.ok(Math.abs(maximumY(r.arms[0].upper)-.5)<1e-5,top);
  assert.equal(r.arms[0].lower.material,r.skinMaterial,top+' forearm exposed');
  const model=['bdu-shirt','acu-shirt'].includes(top)?
   r.visualKit.fieldBlouses[top]:r.visualKit.newUpper.cuts[top];
  assert.ok(model.rolledUpper.every(g=>g.visible),top+' rolled cuff present');
  assert.ok(model.upper.every(g=>!g.visible),top+' shoulder pockets hidden');
  const expected=top==='bdu-shirt'||top==='acu-shirt'?
   r.visualKit.fieldBlouses['bdu-shirt'].cuffMaterial:
   top==='combat-shirt'?r.visualKit.newUpper.combatKnit:
   top==='smock-jacket'?r.visualKit.newUpper.smockCuff:
   r.visualKit.newUpper.gorkaCuff;
  for(const g of model.rolledUpper){
   const meshes=[];g.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o)});
   assert.ok(meshes.length>0,top+' roll has material');
   assert.ok(meshes.every(m=>m.material===expected),top+' rolled group has no pocket mesh');
   const localY=meshes.flatMap(mesh=>{
    mesh.updateMatrix();
    const geo=mesh.geometry.clone().applyMatrix4(mesh.matrix);
    geo.computeBoundingBox();
    const b=geo.boundingBox;
    geo.dispose();
    return [b.min.y,b.max.y];
   });
   assert.ok(Math.min(...localY)>.15,top+' fabric roll sits near elbow');
  }
  pose(r,top,'gorka-trousers','cuffed','cuffed');
  assert.strictEqual(r.arms[0].upper.geometry,fullUpper,top+' cuffed upper arm intact');
  assert.ok(model.cuffedLower.every(g=>g.visible),top+' cuff still visible');
  assert.equal(r.visualKit.fieldTrousers['gorka-trousers'].suspenders.visible,false);
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


test('leg cuff color follows trouser/roll swatch, not top, with fatter cargo pockets',()=>{
 const r=createOperatorRig('rook','blue');
 const cuff=r.visualKit.fieldTrousers['bdu-trousers'].cuffMaterial;
 assert.equal(cuff.map,null,'fold has solid cloth, not a second camo stamp');
 pose(r,'bdu-shirt','acu-trousers','unrolled','cuffed',
  {top:'olive-drab',trousers:'khaki'});
 assert.equal(cuff.color.getHex(),garmentSolidHex('khaki'));
 pose(r,'bdu-shirt','acu-trousers','unrolled','cuffed',
  {top:'forest-green',trousers:'khaki'});
 assert.equal(cuff.color.getHex(),garmentSolidHex('khaki'),
  'recoloring jacket cannot alter leg cuffs');
 pose(r,'bdu-shirt','acu-trousers','unrolled','cuffed',
  {top:'forest-green',trousers:'ranger-green'});
 assert.equal(cuff.color.getHex(),garmentSolidHex('ranger-green'));
 pose(r,'bdu-shirt','acu-trousers','unrolled','cuffed',
  {top:'forest-green',trousers:'ranger-green'},'coyote');
 assert.equal(cuff.color.getHex(),garmentSolidHex('coyote'),
  'explicit rolled-fabric override colors leg cuffs too');
 for(const p of Object.values(FIELD_TROUSER_PROFILES)){
  assert.ok(p.cargo[0]>1.05,'bulky thigh cargo projection');
  assert.ok(p.flap[0]>=.32,'readable thick pocket flap');
 }
 r.dispose();
});
