import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  waterAppearanceAtDepth, WATER_DEEP_COLOR, WATER_SHORE_COLOR,
} from '../src/water-visual-model.ts';

test('water fades to transparent at actual shoreline and deepens monotonically',()=>{
  const samples=[0,.002,.008,.014,.028,.04,.07,.09,.2].map(waterAppearanceAtDepth);
  assert.equal(samples[0].depthMix,0);
  for(let i=1;i<samples.length;i++){
    assert.ok(samples[i].opacity>=samples[i-1].opacity);
    assert.ok(samples[i].depthMix>=samples[i-1].depthMix);
    assert.ok(samples[i].opacity<=1);
    assert.ok(samples[i].depthMix<=1);
  }
  assert.ok(samples[0].opacity<.1);
  assert.ok(samples[6].opacity>.75);
  assert.equal(samples[8].depthMix,1);
  assert.ok(WATER_DEEP_COLOR!==WATER_SHORE_COLOR);
  assert.deepEqual(waterAppearanceAtDepth(-1),waterAppearanceAtDepth(0));
});

test('pond uses real scene lighting and tone mapping; no unlit checkerboard ripples',()=>{
  const source=readFileSync(new URL('../src/puddles.ts',import.meta.url),'utf8');
  assert.match(source,/new THREE\.MeshStandardMaterial\(/);
  assert.match(source,/vertexColors:\s*true/);
  assert.match(source,/transparent:\s*true/);
  assert.match(source,/depthTest:\s*true/);
  assert.match(source,/depthWrite:\s*false/);
  assert.match(source,/Float32BufferAttribute\(colors,4\)/);
  assert.match(source,/geometry\.setAttribute\('normal'/);
  assert.match(source,/waterAppearanceAtDepth\(level-point\.h\)/);
  assert.doesNotMatch(source,/ShaderMaterial|toneMapped:\s*false|sin\(|cos\(/);
  assert.match(source,/water\.surfaceLevel\(basin\.id\)/);
  assert.match(source,/submergedPolygon\(triangle,level\)/);
});

test('same measured depth has fixed appearance at night, noon or when raining',()=>{
  // Water coloration itself is not keyframed by the clock; lighting changes
  // are supplied by the renderer's directional and hemisphere lights.
  const result=waterAppearanceAtDepth(.04);
  assert.deepEqual(result,waterAppearanceAtDepth(.04));
  const source=readFileSync(new URL('../src/puddles.ts',import.meta.url),'utf8');
  assert.match(source,/_env:EnvironmentState/);
  assert.match(source,/_rainAmount:number/);
  assert.doesNotMatch(source,/skyTint|uniforms\.sunlight|uniforms\.hour/);
});
