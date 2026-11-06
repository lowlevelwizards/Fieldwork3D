/** Regression for live build 6ca6bb5's vertical-strip corruption.
 * UV dimensions can be 10x the actual unit-height arm/leg bone, because
 * the animator stretches that unit-height geometry into full limb length.
 * Baking/lightmap segmentation MUST NOT turn those UV dimensions into the
 * geometry's physical dimensions (which the animator then stretches again).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {enableBakedGearAO} from '../src/operator-baked-gear-ao.ts';
import {garmentBoxUV} from '../src/operator-fabric-camo-materials.ts';
import {boxFaceVertexRanges} from '../src/rendering/pixel-materials.ts';
import {TILE_WORLD_SIZE} from '../src/rendering/pixel-recipes.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout,setEquipmentChoice}
 from '../src/equipment-loadouts.ts';

function physicalHeight(g){
 g.computeBoundingBox();
 const box=g.boundingBox;
 assert.ok(box);
 return box.max.y-box.min.y;
}
function assertUnitSegment(mesh,label){
 const bank=mesh.userData.garmentSegmentGeometries;
 assert.ok(bank,label+' has IK-approved cut geometry variants');
 for(const [cut,g] of Object.entries(bank)){
  const height=physicalHeight(g);
  const expected=cut==='full'?1:cut==='bloused'?.70:.74;
  assert.ok(Math.abs(height-expected)<.005,
   label+'/'+cut+' physical height '+height+' expected '+expected+
   ' (UV height MUST NOT multiply IK geometry)');
  assert.ok(g.getAttribute('color')?.count===g.getAttribute('position').count,
   label+'/'+cut+' keeps normalized AO per vertex');
 }
}
function clothesOnlyKit(){
 let kit=initialEquipmentLoadout();
 for(const [slot,id] of [
  ['head','head-none'],['armor','armor-none'],['rig','rig-none'],
  ['belt','belt-none'],['backpack','backpack-none'],
  ['medical','medical-none'],['tactical','tactical-none'],
  ['utility','utility-none']
 ])kit=setEquipmentChoice(kit,slot,id);
 return kit;
}
function pose(r,kit,top,camo='ucp'){
 const original=initialWardrobe();
 const wardrobe={...original,styles:{...original.styles,
  top,headwear:'bare',armorStyle:'armor-bare',rigStyle:'no-rig',
  beltStyle:'no-belt',packStyle:'no-pack'},
  fabricCamo:{...original.fabricCamo,top:camo,trousers:camo}};
 poseOperator(r,{x:0,z:0,heading:0,velocity:0,seconds:0,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:0,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,turning:0,deterministic:true,
  unarmedPreview:true,equipment:kit,wardrobe},0);
}
test('an AO/lightmapped bone preserves its UNIT mesh even with 11.25-unit UV height',()=>{
 const material=new THREE.MeshStandardMaterial({color:0xa6a899});
 material.userData.fieldworkFabric=true;
 enableBakedGearAO(material);
 const physical=new THREE.BoxGeometry(3.9,1,4);
 const metric=garmentBoxUV(physical,3.9,11.25,4,material);
 assert.ok(Math.abs(physicalHeight(metric)-1)<.00001,
  'old bug replaced 1-unit body mesh with 11.25-unit tall visual geometry');
 assert.ok(metric.getAttribute('position').count>24,
  'still provides subdivided receiver faces for baked lighting');
 const uv=metric.getAttribute('uv');
 const {start,count}=boxFaceVertexRanges(metric)[0];
 let low=Infinity,high=-Infinity;
 for(let i=start;i<start+count;i++){
  low=Math.min(low,uv.getY(i));high=Math.max(high,uv.getY(i));
 }
 assert.ok(Math.abs((high-low)-11.25/TILE_WORLD_SIZE)<.001,
  'camouflage scale must still cover the REAL limb length');
 metric.dispose();material.dispose();
});
test('real operator IK arms AND thighs keep physical lengths across all cuts',()=>{
 const r=createOperatorRig('rook','blue',true);
 try{
  for(const [i,arm] of r.arms.entries()){
   assertUnitSegment(arm.upper,'arm '+i+' upper');
   assertUnitSegment(arm.lower,'arm '+i+' forearm');
  }
  for(const [i,foot] of r.feet.entries()){
   assertUnitSegment(foot.upper,'leg '+i+' upper');
   assertUnitSegment(foot.lower,'leg '+i+' shin');
  }
 }finally{r.dispose();}
});
test('Studio Tops -> Material -> Clothes Only remains a human-sized silhouette',()=>{
 const r=createOperatorRig('rook','blue',true),kit=clothesOnlyKit();
 try{
  for(const top of ['bdu-shirt','acu-shirt','combat-shirt','smock-jacket',
   'gorka-jacket']){
   pose(r,kit,top,top==='acu-shirt'?'ucp':'m81-woodland');
   r.root.updateMatrixWorld(true);
   for(const [label,part] of [
    ...r.arms.flatMap((arm,i)=>[['arm '+i+' upper',arm.upper],
     ['arm '+i+' forearm',arm.lower]]),
    ...r.feet.flatMap((leg,i)=>[['leg '+i+' upper',leg.upper],
     ['leg '+i+' shin',leg.lower]])
   ]){
    const geometry=part.geometry;
    geometry.computeBoundingBox();
    const rendered=geometry.boundingBox.clone().applyMatrix4(part.matrixWorld);
    const worldLongest=rendered.getSize(new THREE.Vector3()).length();
    assert.ok(worldLongest<38,top+': '+label+' was stretched into a spike ('+
     worldLongest.toFixed(1)+' units)');
   }
  }
 }finally{r.dispose();}
});
