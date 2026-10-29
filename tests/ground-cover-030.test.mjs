import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groundCoverAt, showIndividualBlades } from '../src/ground-cover-model.ts';
import { injectGroundCoverGrain } from '../src/ground-cover-material.ts';
import { makeTerrainGeometry,updateTerrainMoisture } from '../src/terrain.ts';
import { TerrainWater } from '../src/hydrology.ts';
import { GRID_CELLS } from '../src/terrain-model.ts';

test('perennial ground cover is continuous, deterministic and meaningfully varied',()=>{
  let min=1,max=0,green=0,bare=0;
  for(let z=-4.8;z<=4.8;z+=.16){
    for(let x=-4.8;x<=4.8;x+=.16){
      const sample=groundCoverAt(x,z);
      assert.deepEqual(sample,groundCoverAt(x,z));
      assert.ok(Object.values(sample).every(Number.isFinite));
      assert.ok(sample.coverage>=0&&sample.coverage<=1);
      assert.ok(sample.longTermMoisture>=0&&sample.longTermMoisture<=1);
      min=Math.min(min,sample.coverage);
      max=Math.max(max,sample.coverage);
      if(sample.coverage>.40)green++;
      if(sample.coverage<.12)bare++;
      // Landscape should be smooth at scales smaller than the physics grid.
      const neighbor=groundCoverAt(x+.01,z);
      assert.ok(Math.abs(sample.coverage-neighbor.coverage)<.12,
        'no sharp tile boundary in vegetation coverage');
    }
  }
  assert.ok(max>.52,'drained fertile terrain should become visibly green');
  assert.ok(min<.08,'exposed slopes or channels should remain bare');
  assert.ok(green>50&&bare>50,'the landscape needs both ground types');
});
test('drainage exposure suppresses grass in the actual river channel',()=>{
  const channel=groundCoverAt(0,0);
  const terrace=groundCoverAt(-1,0);
  assert.ok(channel.channelExposure>terrace.channelExposure);
  assert.ok(channel.coverage<terrace.coverage);
});
test('ground-cover attributes stay fixed while actual rain changes colors only',()=>{
  const mesh=makeTerrainGeometry();
  const coverage=mesh.getAttribute('terrainCover');
  const top=(GRID_CELLS+1)*(GRID_CELLS+1)+GRID_CELLS*GRID_CELLS;
  assert.equal(coverage.count,mesh.getAttribute('position').count);
  const before=Array.from(coverage.array);
  assert.ok(before.slice(0,top).some(v=>v>.40));
  assert.ok(before.slice(top).every(v=>v===0));
  const dryWater=new TerrainWater();
  updateTerrainMoisture(mesh,dryWater);
  const dryColors=Array.from(mesh.getAttribute('color').array);
  const snapshot=dryWater.snapshot();
  const wetWater=new TerrainWater();
  for(let t=0;t<4;t+=.2)wetWater.advance(5+t,.2,1);
  const waterState=wetWater.snapshot();
  updateTerrainMoisture(mesh,wetWater);
  const wetColors=Array.from(mesh.getAttribute('color').array);
  assert.deepEqual(Array.from(coverage.array),before);
  assert.ok(dryColors.some((v,i)=>i<top*3&&Math.abs(v-wetColors[i])>.006),
    'wet conditions should darken an otherwise fixed vegetated surface');
  assert.deepEqual(dryWater.snapshot(),snapshot);
  assert.deepEqual(wetWater.snapshot(),waterState);
  assert.ok(Math.abs(wetWater.massBalanceError())<.0001);
});
test('inspection colors only reflect precomputed grass cover, not water storage',()=>{
  const geometry=makeTerrainGeometry();
  const dry=new TerrainWater(),wet=new TerrainWater();
  for(let t=0;t<4;t+=.2)wet.advance(t,.2,1);
  updateTerrainMoisture(geometry,dry,true);
  const before=Array.from(geometry.getAttribute('color').array);
  updateTerrainMoisture(geometry,wet,true);
  const after=Array.from(geometry.getAttribute('color').array);
  assert.deepEqual(before,after);
});
test('grain shader is attached to the existing standard terrain surface only',()=>{
  const shader={
    vertexShader:'#include <common>\n#include <begin_vertex>',
    fragmentShader:'#include <common>\n#include <color_fragment>',
  };
  injectGroundCoverGrain(shader);
  assert.ok(shader.vertexShader.includes('vTerrainCover=terrainCover'));
  assert.ok(shader.fragmentShader.includes('diffuseColor.rgb *='));
  assert.ok(shader.fragmentShader.includes('vTerrainXZ*24.0'));
  assert.throws(()=>injectGroundCoverGrain({
    vertexShader:'',fragmentShader:'',
  }),/anchors changed/);
});
test('individual blades are reserved for a genuinely close camera scale',()=>{
  assert.equal(showIndividualBlades(12/390),false);
  assert.equal(showIndividualBlades(6/390),false);
  assert.equal(showIndividualBlades(.002),true);
});
test('main scene contains the cover inspector but does not instantiate 3D blades',()=>{
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  const html=readFileSync(new URL('../verdigris.html',import.meta.url),'utf8');
  assert.ok(html.includes('id="coverToggle"'));
  assert.ok(html.includes('id="coverStatus"'));
  assert.ok(main.includes('updateTerrainMoisture(ground.geometry,standingWater,coverInspection)'));
  assert.ok(main.includes('groundCoverAt(x,z)'));
  assert.ok(main.includes('createGroundCoverMaterial()'));
  assert.ok(!main.includes('new GrassPatchField(scene)'));
  assert.ok(main.includes('new ValleyRiverField(scene)'));
});
