import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TerrainWater } from '../src/hydrology.ts';
import { terrainHeight } from '../src/terrain-model.ts';
import { buildHydraulicWaterMesh } from '../src/hydraulic-water-mesh-model.ts';

function assertSafeMesh(data){
  assert.equal(data.position.length/3,data.rgba.length/4);
  assert.equal(data.position.length,data.normal.length);
  assert.equal(data.position.length,data.triangleCount*9);
  assert.ok(data.maxHeightStep<=.02800001,'large sloping water triangles would become spikes');
  assert.ok(data.position.every(Number.isFinite));
  assert.ok(data.rgba.every(Number.isFinite));
  for(let i=0;i<data.position.length;i+=3){
    const x=data.position[i],y=data.position[i+1],z=data.position[i+2];
    assert.ok(y>=terrainHeight(x,z)-.025,'rendered water must not be far below the terrain');
  }
  for(let i=3;i<data.rgba.length;i+=4){
    assert.ok(data.rgba[i]>=0&&data.rgba[i]<=.70001);
  }
  for(let i=0;i<data.normal.length;i+=3){
    assert.equal(data.normal[i],0);
    assert.equal(data.normal[i+1],1);
    assert.equal(data.normal[i+2],0);
  }
}

test('all water drained produces no translucent quad grid',()=>{
  const water=new TerrainWater();
  const before=water.snapshot();
  const mesh=buildHydraulicWaterMesh(water);
  assertSafeMesh(mesh);
  assert.equal(mesh.triangleCount,0);
  assert.equal(mesh.position.length,0);
  assert.deepEqual(water.snapshot(),before);
});

test('an actual rainy valley generates one bounded physical-water mesh',()=>{
  const water=new TerrainWater();
  water.advance(5,4,1);
  const state=water.snapshot();
  const data=buildHydraulicWaterMesh(water);
  assertSafeMesh(data);
  assert.ok(data.triangleCount>0,'rain and the headwater inlet make surface water');
  assert.ok(data.sampleCount>16000);
  assert.deepEqual(water.snapshot(),state);
  assert.ok(Math.abs(water.massBalanceError())<1e-4);
});

test('saved physical water renders consistently regardless of day or redraw',()=>{
  const water=new TerrainWater();
  water.advance(8,2.5,1);
  const before=water.snapshot();
  const first=buildHydraulicWaterMesh(water);
  const second=buildHydraulicWaterMesh(new TerrainWater(undefined,before));
  assertSafeMesh(first);
  assert.deepEqual(first,second);
  assert.deepEqual(water.snapshot(),before);
});

test('fine sampling increases shoreline detail without changing any litres',()=>{
  const water=new TerrainWater();
  water.advance(6,3,1);
  const before=water.snapshot();
  const coarse=buildHydraulicWaterMesh(water,2);
  const detailed=buildHydraulicWaterMesh(water,4);
  assertSafeMesh(coarse);
  assertSafeMesh(detailed);
  assert.ok(detailed.sampleCount>coarse.sampleCount);
  assert.deepEqual(water.snapshot(),before);
  assert.throws(()=>buildHydraulicWaterMesh(water,1),/tessellation/);
});

test('water no longer draws stacked transparent patches with DoubleSide',()=>{
  const src=readFileSync(new URL('../src/hydraulic-surface-field.ts',import.meta.url),'utf8');
  const model=readFileSync(new URL('../src/hydraulic-water-mesh-model.ts',import.meta.url),'utf8');
  assert.ok(src.includes('side:THREE.FrontSide'));
  assert.ok(src.includes('buildHydraulicWaterMesh(water,4)'));
  assert.ok(model.includes('const samples:WaterSample[]=new Array'));
  assert.ok(model.includes('if(span>.028)return'));
  assert.ok(model.includes('clipWaterTriangle('));
  assert.ok(model.includes('source===0'));
  assert.ok(!src.includes('DoubleSide'));
  assert.ok(!src.includes('addQuad('));
});
