import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { establishGrassPatch,GRASS_PATCH } from '../src/grass-atom.ts';
import { terrainHeight } from '../src/terrain-model.ts';
import { surfaceAt } from '../src/surface-materials.ts';
import { TerrainWater } from '../src/hydrology.ts';
import { buildRiverRibbon,waterDepthForScenario } from '../src/river-ribbon-model.ts';
import { buildPondMeshes } from '../src/river-pond-model.ts';

test('only one deterministic rooted grass patch is generated',()=>{
  const a=establishGrassPatch(),b=establishGrassPatch();
  assert.deepEqual(a,b);
  assert.ok(a.length>=25,'at least one visible patch of blades is needed');
  assert.ok(a.length<=144);
  for(const blade of a){
    assert.ok(Math.hypot(blade.x-GRASS_PATCH.x,blade.z-GRASS_PATCH.z)
      <=GRASS_PATCH.radius+.0001);
    assert.equal(blade.y,terrainHeight(blade.x,blade.z));
    assert.ok(blade.height>=.125 && blade.height<.26);
    assert.ok(['loam','clay','organic'].includes(surfaceAt(blade.x,blade.z).kind));
  }
  assert.notDeepEqual(establishGrassPatch(100),a);
  assert.throws(()=>establishGrassPatch(1001),/Invalid/);
});

test('river in main reads real conserved water stage, not a fixed water paint layer',()=>{
  const water=new TerrainWater();
  const dry=buildRiverRibbon('live',water);
  assert.equal(dry.triangles,0);
  water.advance(5,4,1);
  const state=water.snapshot();
  const wet=buildRiverRibbon('live',water);
  const pond=buildPondMeshes(water);
  assert.ok(wet.triangles>0,'physical runoff should fill the main river corridor');
  assert.ok(wet.position.every(Number.isFinite));
  assert.ok(wet.color.every(Number.isFinite));
  assert.ok(pond.position.every(Number.isFinite));
  assert.equal(wet.position.length/3,wet.color.length/4);
  assert.ok(waterDepthForScenario('live',0,water)>=0);
  assert.deepEqual(water.snapshot(),state,'drawing must never alter measured litres');
  assert.ok(Math.abs(water.massBalanceError())<1e-4);
});

test('the main scene uses the river lab geography and leaves old grid renderer inactive',()=>{
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  const river=readFileSync(new URL('../src/valley-river-field.ts',import.meta.url),'utf8');
  const grass=readFileSync(new URL('../src/grass-patch-field.ts',import.meta.url),'utf8');
  assert.ok(main.includes('new ValleyRiverField(scene)'));
  assert.ok(main.includes('new GrassPatchField(scene)'));
  assert.ok(!main.includes('new HydraulicSurfaceField(scene)'));
  assert.ok(river.includes("buildRiverRibbon('live',water)"));
  assert.ok(river.includes('buildPondMeshes(water)'));
  assert.ok(!river.includes('buildHydraulicWaterMesh('));
  assert.ok(grass.includes('new THREE.InstancedMesh('));
  assert.ok(grass.includes('establishGrassPatch('));
});
