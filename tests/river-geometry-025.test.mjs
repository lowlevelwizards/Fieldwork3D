import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MAIN_RIVER,mainRiverCenterX,mainRiverIncisionAt,
  mainRiverNormal,mainRiverStations,mainRiverPosition,
} from '../src/river-geography.ts';
import {
  buildRiverRibbon,wettedHalfWidth,RIVER_TEST_LEVELS,
} from '../src/river-ribbon-model.ts';
import { TerrainWater } from '../src/hydrology.ts';
import { terrainHeight,valleyAxisX } from '../src/terrain-model.ts';
import { buildPondMeshes,makeReferencePond } from '../src/river-pond-model.ts';

test('the hydrology grid and the river use exactly the same landform axis and incision',()=>{
  for(let z=-5;z<=5;z+=.1){
    assert.equal(mainRiverCenterX(z),valleyAxisX(z));
    const center=mainRiverCenterX(z);
    assert.ok(Math.abs(mainRiverIncisionAt(center,z)-.082)<1e-9);
    assert.ok(mainRiverIncisionAt(center+.9,z)<.002);
    const n=mainRiverNormal(z);
    assert.ok(Math.abs(Math.hypot(n.x,n.z)-1)<1e-12);
  }
  assert.equal(MAIN_RIVER.corridorMinZ,-5);
  assert.equal(MAIN_RIVER.corridorMaxZ,5);
});

test('permanent channel exists as a geographic depression even when completely dry',()=>{
  const stations=mainRiverStations(terrainHeight);
  assert.equal(stations.length,97);
  for(const s of stations.slice(1,-1)){
    assert.ok(Number.isFinite(s.bedY));
    assert.ok(s.bankLeftY>s.bedY,
      'real west bank must stand above carved channel');
    assert.ok(s.bankRightY>s.bedY,
      'real east bank must stand above carved channel');
    const center=mainRiverPosition(s.z,0);
    assert.ok(Math.abs(center.x-s.x)<1e-9);
  }
});

test('continuous river geometry grows wider with water level and dries without changing geography',()=>{
  const dry=buildRiverRibbon('dry');
  const normal=buildRiverRibbon('normal');
  const high=buildRiverRibbon('high');
  const flood=buildRiverRibbon('flood');
  const recession=buildRiverRibbon('recession');
  assert.equal(dry.triangles,0);
  for(const m of [normal,high,flood,recession]){
    assert.ok(m.triangles>0);
    assert.equal(m.position.length/3,m.color.length/4);
    assert.equal(m.position.length,m.normal.length);
    assert.ok(m.position.every(Number.isFinite));
    assert.ok(m.color.every(Number.isFinite));
    assert.ok(m.maxTriangleHeightM<.03);
    assert.ok(m.widths.every(w=>w.left>=0&&w.right>=0));
  }
  const medianWidth=m=>m.widths[Math.floor(m.widths.length/2)].left+
    m.widths[Math.floor(m.widths.length/2)].right;
  assert.ok(medianWidth(normal)<medianWidth(high));
  assert.ok(medianWidth(high)<medianWidth(flood));
  assert.ok(medianWidth(recession)<medianWidth(high));
  // Ordinary flow must not mistake the neighboring tributary gully for
  // several metres of extra main-river width (a screenshot regression).
  const maximumWidth=mesh=>Math.max(...mesh.widths.map(w=>w.left+w.right));
  assert.ok(maximumWidth(normal)<=1.08001);
  assert.ok(maximumWidth(high)<=1.502);
  assert.ok(maximumWidth(flood)>maximumWidth(high));
  assert.ok(RIVER_TEST_LEVELS.recession>RIVER_TEST_LEVELS.normal);
});

test('river never projects across the first dry bank into detached depressions',()=>{
  for(let z=-4.5;z<=4.5;z+=.7){
    const center=mainRiverPosition(z,0);
    const y=terrainHeight(center.x,center.z)+.036;
    for(const side of [-1,1]){
      const width=wettedHalfWidth(z,y,side,terrainHeight);
      assert.ok(width>0&&width<1.5);
      const inner=mainRiverPosition(z,side*width*.87);
      const outer=mainRiverPosition(z,side*(width+.02));
      assert.ok(terrainHeight(inner.x,inner.z)<y+.015);
      assert.ok(terrainHeight(outer.x,outer.z)>=y-.01);
    }
  }
});

test('a pond is horizontally level and built only from actual basin water',()=>{
  const fresh=new TerrainWater();
  const dry=buildPondMeshes(fresh);
  assert.equal(dry.triangles,0);
  const fixture=makeReferencePond(fresh);
  const before=fixture.snapshot();
  const pool=buildPondMeshes(fixture);
  assert.ok(pool.triangles>0);
  assert.equal(pool.position.length,pool.normal.length);
  assert.equal(pool.position.length/3,pool.color.length/4);
  assert.deepEqual(fixture.snapshot(),before);
  assert.ok(Math.abs(fixture.massBalanceError())<1e-4);
});

test('live hydraulic scenario is derived from saved litres, not painted channel strips',()=>{
  const water=new TerrainWater();
  water.advance(5,3,1);
  const before=water.snapshot();
  const river=buildRiverRibbon('live',water);
  assert.ok(river.triangles>=0);
  assert.ok(river.position.every(Number.isFinite));
  assert.deepEqual(water.snapshot(),before);
  assert.ok(Math.abs(water.massBalanceError())<1e-4);
});

test('isolated page publishes visible scenarios and geometry overlays without replacing main renderer',()=>{
  const html=readFileSync(new URL('../river-lab.html',import.meta.url),'utf8');
  const lab=readFileSync(new URL('../src/river-lab-main.ts',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  assert.ok(html.includes('data-scenario="dry"'));
  assert.ok(html.includes('data-scenario="flood"'));
  assert.ok(html.includes('data-scenario="pond"'));
  assert.ok(html.includes('data-scenario="live"'));
  assert.ok(lab.includes('mainRiverStations('));
  assert.ok(lab.includes("document.documentElement.dataset.riverLabReady='true'"));
  assert.ok(main.includes('new ValleyRiverField(scene)'));
  assert.ok(!main.includes('new GrassPatchField(scene)'));
  assert.ok(main.includes('createGroundCoverMaterial()'));
  assert.ok(!main.includes('buildRiverRibbon('));
});
