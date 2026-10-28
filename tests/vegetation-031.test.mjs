import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import {
  establishWoodyVegetation,woodyHabitatAt,shrubHabitatAt,canopyAt,
  woodyFootprintAt,
} from '../src/vegetation-model.ts';
import { createWoodyGeometry } from '../src/vegetation-geometry.ts';
import { paintWoodyInspection,woodyInspectionValue } from '../src/vegetation-inspection.ts';
import { terrainHeight,WORLD_HALF } from '../src/terrain-model.ts';
import { makeTerrainGeometry,updateTerrainMoisture } from '../src/terrain.ts';
import { TerrainWater } from '../src/hydrology.ts';

test('woody habitat is long-term terrain-driven and bounded, not instantaneous rain',()=>{
  let bestTree=0,bestShrub=0,channelTree=0,channelCount=0;
  const empty=[];
  for(let z=-4.6;z<=4.6;z+=.26)for(let x=-4.6;x<=4.6;x+=.26){
    const h=woodyHabitatAt(x,z);
    const s=shrubHabitatAt(x,z,empty);
    assert.ok(Object.values(h).every(Number.isFinite));
    assert.ok(Object.values(s).every(Number.isFinite));
    assert.ok(h.tree>=0&&h.tree<=1&&s.shrub>=0&&s.shrub<=1);
    bestTree=Math.max(bestTree,h.tree);
    bestShrub=Math.max(bestShrub,s.shrub);
    if(h.drainage<.2){channelTree+=h.tree;channelCount++;}
  }
  assert.ok(bestTree>.35,'tree suitability must permit some woodland');
  assert.ok(bestShrub>.2,'shrub suitability must permit some understory');
  assert.ok(channelCount>10);
  assert.ok(channelTree/channelCount<.04,
    'plants should not establish in the active river channel');
});
test('trees and shrubs are deterministic, physically grounded, suitably separated',()=>{
  const a=establishWoodyVegetation(31),b=establishWoodyVegetation(31);
  assert.deepEqual(a,b);
  assert.ok(a.trees.length>=2&&a.trees.length<=6,
    'small test scene should form a few trees, not a forest of balls');
  assert.ok(a.shrubs.length>=4&&a.shrubs.length<=16,
    'woodland edges should carry some shrubs');
  const all=[...a.trees,...a.shrubs];
  for(const p of all){
    assert.equal(p.y,terrainHeight(p.x,p.z));
    assert.ok(p.x> -WORLD_HALF+p.canopyRadius*.4);
    assert.ok(p.x< WORLD_HALF-p.canopyRadius*.4);
    assert.ok(p.z> -WORLD_HALF+p.canopyRadius*.4);
    assert.ok(p.z< WORLD_HALF-p.canopyRadius*.4);
    assert.ok(p.suitability>.20);
    assert.ok(p.height>.25&&p.height<2.5);
    assert.ok(woodyFootprintAt(p.x,p.z,a));
  }
  for(let i=0;i<a.trees.length;i++)for(let j=i+1;j<a.trees.length;j++)
    assert.ok(Math.hypot(a.trees[i].x-a.trees[j].x,
      a.trees[i].z-a.trees[j].z)>=1.13);
  for(let i=0;i<a.shrubs.length;i++)for(let j=i+1;j<a.shrubs.length;j++)
    assert.ok(Math.hypot(a.shrubs[i].x-a.shrubs[j].x,
      a.shrubs[i].z-a.shrubs[j].z)>
      a.shrubs[i].canopyRadius+a.shrubs[j].canopyRadius+.025);
  assert.notDeepEqual(a,establishWoodyVegetation(32));
});
test('tree crowns generate genuine canopy field and shrub response',()=>{
  const world=establishWoodyVegetation(31);
  const t=world.trees[0];
  const middle=canopyAt(t.x,t.z,world.trees);
  assert.ok(middle>.6&&middle<=1);
  assert.equal(canopyAt(30,30,world.trees),0);
  const edge=shrubHabitatAt(t.x+t.canopyRadius*.82,t.z,world.trees);
  assert.ok(edge.canopy>0&&edge.canopy<1);
  assert.ok(edge.edge>=0&&edge.edge<=1);
  const openness=1-middle;
  assert.ok(openness<.4);
});
test('physical foliage remains unchanged during rain and all hydrology masses are conserved',()=>{
  const water=new TerrainWater();
  const before=establishWoodyVegetation(31);
  for(let i=0;i<18;i++)water.advance(4+i*.1,.1,1);
  const wet=water.snapshot();
  assert.deepEqual(before,establishWoodyVegetation(31));
  assert.deepEqual(wet,water.snapshot());
  assert.ok(Math.abs(water.massBalanceError())<.0001);
});
test('woody inspection paints only the existing heightfield, never its geometry',()=>{
  const world=establishWoodyVegetation(31),geometry=makeTerrainGeometry();
  const before=Array.from(geometry.getAttribute('position').array);
  const old=Array.from(geometry.getAttribute('color').array);
  for(const mode of ['tree','shrub','canopy']){
    paintWoodyInspection(geometry,world,mode);
    assert.ok(woodyInspectionValue(0,0,world,mode)>=0);
    assert.ok(woodyInspectionValue(0,0,world,mode)<=1);
  }
  assert.deepEqual(Array.from(geometry.getAttribute('position').array),before);
  assert.notDeepEqual(Array.from(geometry.getAttribute('color').array),old);
  const water=new TerrainWater();
  const snapshot=water.snapshot();
  updateTerrainMoisture(geometry,water);
  assert.deepEqual(water.snapshot(),snapshot);
});
test('tree and shrub geometry is deliberately low-poly and rooted',()=>{
  const models=createWoodyGeometry();
  for(const geom of Object.values(models)){
    assert.ok(geom instanceof THREE.BufferGeometry);
    assert.ok(geom.getAttribute('position').count<145,
      'individual foliage should not be high-poly');
    assert.ok((geom.index?.count??geom.getAttribute('position').count)/3<80,
      'each canopy should have few visible facets');
    geom.dispose();
  }
});
test('the main view has a contextual woody inspector and a stable vegetation field',()=>{
  const source=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(source.includes('new VegetationField(scene)'));
  assert.ok(source.includes('paintWoodyInspection('));
  assert.ok(source.includes('woodyHabitatAt(x,z'));
  assert.ok(source.includes('woodyInspection'));
  for(const id of ['woodyToggle','woodyLayer','woodyPanel','woodyStatus'])
    assert.ok(html.includes('id="'+id+'"'));
  assert.ok(source.includes('new ValleyRiverField(scene)'));
});
