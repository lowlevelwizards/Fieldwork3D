import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  clipWaterTriangle,submergedDepth,wetSignal,triangleHasVisibleWater,
} from '../src/water-surface-geometry.ts';
import { TerrainWater } from '../src/hydrology.ts';

const vertex=(x,z,groundY,waterY,coverage=1)=>({
  x,z,groundY,waterY,coverage,
});
const area=(a,b,c)=>Math.abs((b.x-a.x)*(c.z-a.z)-
  (b.z-a.z)*(c.x-a.x))/2;

test('wet triangle entirely below the terrain never generates geometry',()=>{
  const triangles=clipWaterTriangle(
    vertex(0,0,.3,.2),vertex(1,0,.3,.2),vertex(0,1,.3,.2));
  assert.deepEqual(triangles,[]);
});

test('one-sided shoreline is clipped at its local ground contour',()=>{
  const a=vertex(0,0,0,.04),b=vertex(1,0,.06,.04);
  const c=vertex(0,1,.06,.04);
  const triangles=clipWaterTriangle(a,b,c);
  assert.ok(triangles.length>0);
  assert.ok(triangles.flat().every(v=>
    Number.isFinite(v.waterY)&&Number.isFinite(v.groundY)));
  assert.ok(triangles.flat().every(v=>wetSignal(v)>=-1e-8));
  assert.ok(triangles.flat().every(v=>v.waterY>=v.groundY-1e-8));
  const clippedArea=triangles.reduce((total,t)=>total+area(...t),0);
  assert.ok(clippedArea>0&&clippedArea<.5);
});

test('a deep bank next to dry land cannot extrude a hanging water curtain',()=>{
  const disconnected=clipWaterTriangle(
    vertex(0,0,0,.4),vertex(1,0,0,.0),vertex(0,1,0,.39));
  assert.deepEqual(disconnected,[],
    'large water-level discontinuities must not become tall triangles');
  const coherent=clipWaterTriangle(
    vertex(0,0,0,.055),vertex(.1,0,0,.053),vertex(0,.1,.01,.051));
  assert.ok(coherent.length>0);
  for(const t of coherent){
    assert.ok(Math.max(...t.map(v=>v.waterY))-
      Math.min(...t.map(v=>v.waterY))<.12);
  }
});

test('a zero-coverage water edge does not create a visible sheet',()=>{
  const triangles=clipWaterTriangle(
    vertex(0,0,0,.07,0),
    vertex(.1,0,0,.07,0),
    vertex(0,.1,0,.07,0));
  assert.deepEqual(triangles,[]);
  const mixed=clipWaterTriangle(
    vertex(0,0,0,.07,1),
    vertex(.1,0,0,.07,0),
    vertex(0,.1,0,.07,0));
  assert.ok(mixed.length>0);
  assert.ok(mixed.flat().some(v=>submergedDepth(v)>.03));
  assert.ok(mixed.some(triangleHasVisibleWater));
});

test('a pond surface stays horizontal and clips precisely to its valley bowl',()=>{
  const waterY=.09;
  const triangles=clipWaterTriangle(
    vertex(0,0,.03,waterY),vertex(.1,0,.10,waterY),
    vertex(0,.1,.14,waterY));
  assert.ok(triangles.length>0);
  for(const tri of triangles){
    assert.ok(tri.every(v=>Math.abs(v.waterY-waterY)<1e-12));
    assert.ok(tri.every(v=>v.waterY>=v.groundY-1e-8));
  }
});

test('heavy-rain and saved-water ledgers are not mutated by render-side helpers',()=>{
  const water=new TerrainWater();
  water.advance(5,4,1);
  const snapshot=water.snapshot();
  const available=water.watershed.cells.filter(c=>
    water.channelStageAtCell(c.index)>.001);
  for(const c of available){
    const level=c.height+water.channelStageAtCell(c.index);
    const patch=clipWaterTriangle(
      vertex(c.x-.03,c.z-.03,c.height,level),
      vertex(c.x+.03,c.z-.03,c.height,level),
      vertex(c.x,c.z+.03,c.height,level));
    assert.ok(patch.every(t=>t.every(v=>Number.isFinite(v.waterY))));
  }
  assert.deepEqual(water.snapshot(),snapshot);
  assert.ok(Math.abs(water.massBalanceError())<1e-4);
});

test('Build 024.1 does not draw a single global 96x96 grid of raised water',()=>{
  const source=readFileSync(new URL('../src/hydraulic-surface-field.ts',import.meta.url),'utf8');
  const model=readFileSync(new URL('../src/hydraulic-water-mesh-model.ts',import.meta.url),'utf8');
  assert.ok(source.includes('buildHydraulicWaterMesh(water,4)'));
  assert.ok(model.includes('clipWaterTriangle('));
  assert.ok(model.includes('watershed.basins'));
  assert.ok(model.includes('water.channelWettedWidthAtCell('));
  assert.ok(model.includes('selectVisibleRiverLinks('));
  assert.ok(model.includes('water.floodLiters('));
  assert.ok(!source.includes('const verts:Vertex[]=new Array'));
  assert.ok(!source.includes('floodDisplayDepth('));
  assert.ok(source.includes('depthWrite:false'));
  assert.ok(source.includes('MeshStandardMaterial('));
  assert.ok(source.includes('side:THREE.FrontSide'));
});
