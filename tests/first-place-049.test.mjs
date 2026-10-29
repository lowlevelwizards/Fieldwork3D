import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {
 FIRST_PLACE,FENCE,FOOTPATH,DRAINAGE,FIELD_TREES,
 fenceObstructionAt,fieldTreeAt,fieldObjectAt,siteSurfaceAt,
 insideFirstPlace,
} from '../src/first-place-layout.ts';
import {FirstPlaceScene} from '../src/first-place-scene.ts';
import {queryTravel,physicalGroundAt,BUILDINGS} from '../src/regional-physical.ts';
import {coarseHeightAt,RegionalTerrainField} from '../src/regional-terrain.ts';
import {establishRegionalPlants} from '../src/regional-ecology.ts';
import {clearCameraFromGround,cameraGroundClearance}
 from '../src/regional-camera-clearance.ts';

test('049: the new place is one explicitly authored 100x100m worksite, not a whole new region',()=>{
 assert.equal(FIRST_PLACE.halfSize*2,100);
 assert.ok(insideFirstPlace(FIRST_PLACE.house.x,FIRST_PLACE.house.z));
 assert.ok(insideFirstPlace(FIRST_PLACE.shed.x,FIRST_PLACE.shed.z));
 assert.ok(insideFirstPlace(FIRST_PLACE.gate.x,FIRST_PLACE.gate.z));
 assert.ok(FENCE.length>=5&&FOOTPATH.length>=2&&DRAINAGE.length>=1);
 assert.ok(FIELD_TREES.length>=6);
 assert.ok(BUILDINGS.some(b=>b.x===FIRST_PLACE.house.x&&b.z===FIRST_PLACE.house.z));
 assert.ok(BUILDINGS.some(b=>b.x===FIRST_PLACE.shed.x&&b.z===FIRST_PLACE.shed.z));
});
test('049: the gate has a physical opening and the fence never creates invisible barriers',()=>{
 assert.equal(fenceObstructionAt(117,118),false,
   'the main opening must remain a true walkable gap');
 assert.equal(fenceObstructionAt(117,100),true);
 assert.equal(fenceObstructionAt(49,105),true);
 assert.equal(queryTravel(117,100).passable,false);
 assert.ok(!fieldTreeAt(117,118));
 assert.equal(fieldObjectAt(FIRST_PLACE.logCase.x,FIRST_PLACE.logCase.z),true);
});
test('049: near-field props are deterministic and their roots use actual ground height',()=>{
 const scene=new THREE.Scene();
 const model=new FirstPlaceScene(scene);
 assert.ok(scene.children.includes(model.group));
 const meshes=[];
 model.group.traverse(o=>{
  if(o instanceof THREE.Mesh){
   meshes.push(o);
   assert.ok(Number.isFinite(o.position.y));
  }
 });
 assert.ok(meshes.length>70,'site should read as an inhabited landmark');
 assert.ok(meshes.length<650,'do not turn the prototype into a giant prop catalogue');
 assert.ok(Number.isFinite(physicalGroundAt(FIRST_PLACE.spawn.x,FIRST_PLACE.spawn.z)));
 assert.ok(coarseHeightAt('cutwoods',FIRST_PLACE.center.x,FIRST_PLACE.center.z)>100);
 model.dispose(scene);
 assert.ok(!scene.children.includes(model.group));
});
test('049: Rook starts on passable ground with a readable close-range approach',()=>{
 const spawn=FIRST_PLACE.spawn;
 const travel=queryTravel(spawn.x,spawn.z);
 assert.equal(travel.passable,true,'the authored opening spawn must be reachable');
 assert.ok(travel.slopeDegrees<25,'first minutes should not be a cliffside');
 assert.ok(Math.hypot(spawn.x-FIRST_PLACE.shed.x,
   spawn.z-FIRST_PLACE.shed.z)<24);
 const trees=establishRegionalPlants();
 assert.ok(!trees.some(p=>Math.abs(p.x-FIRST_PLACE.center.x)<46&&
  Math.abs(p.z-FIRST_PLACE.center.z)<46));
});
test('049: four local detailed tiles share matching terrain geometry at the compound',()=>{
 const scene=new THREE.Scene();
 const field=new RegionalTerrainField(scene,'cutwoods');
 field.setDetailFocus(FIRST_PLACE.spawn.x,FIRST_PLACE.spawn.z,true);
 for(const r of [4,5])for(const c of [4,5]){
  const mesh=field.group.children[r*8+c];
  assert.equal(mesh.geometry.getAttribute('position').count,4225);
 }
 field.setDetailFocus(0,0,false);
 assert.ok(field.group.children.every(child=>
  child.geometry.getAttribute('position').count===289));
 field.dispose(scene);
});
test('049: camera clears nearby elevated terrain instead of cutting across the view',()=>{
 const ground=(x,z)=>2+3*Math.exp(-((x-5)**2)/10);
 const target={x:0,y:ground(0,0),z:0},eye={x:10,y:4,z:0};
 assert.ok(cameraGroundClearance(eye,target,ground)<1,
  'a too-close camera should actually intersect the terrain');
 const fixed=clearCameraFromGround(eye,target,ground,2);
 assert.ok(fixed.y>eye.y);
 assert.ok(cameraGroundClearance(fixed,target,ground)>=1.999);
 assert.equal(fixed.x,eye.x);assert.equal(fixed.z,eye.z);
 const flat=(x,z)=>x*0+z*0;
 const plain=clearCameraFromGround({x:10,y:10,z:0},
  {x:0,y:0,z:0},flat,.5);
 assert.ok(plain.y>=10);
});
test('049: existing tactical scene, lab, solo input and camera are still present',()=>{
 const main=readFileSync(new URL('../src/world-main.ts',import.meta.url),'utf8');
 const region=readFileSync(new URL('../src/regional-visuals.ts',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
 assert.ok(main.includes('new FirstPlaceScene(scene)'));
 assert.ok(main.includes('if(soloMode)firstPlace='));
 assert.ok(main.includes('clearCameraFromGround('));
 assert.ok(main.includes('newOperation()'));
 assert.ok(main.includes('stepOperation('));
 assert.ok(main.includes('FloatingTouchControls'));
 assert.ok(region.includes('CutwoodsPhysicalScene'));
 assert.ok(lab.includes('new ValleyRiverField(scene)'));
 assert.equal(siteSurfaceAt(83,106),'path');
});
