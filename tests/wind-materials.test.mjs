import test from 'node:test';
import assert from 'node:assert/strict';
import {windAtHour,windDriftAtHour} from '../src/wind-model.ts';
import {surfaceAt,SURFACE,infiltrationBudgetLiters,soilCapacityLiters} from '../src/surface-materials.ts';
import {evaporationMmPerHour} from '../src/evaporation-model.ts';
import {makeTerrainCells} from '../src/terrain-model.ts';
test('wind is a continuous 24-hour cycle and gives actual velocity',()=>{
  for(let h=0;h<24;h+=.05){
    const a=windDriftAtHour(h),next=windDriftAtHour(h+.0001);
    const w=windAtHour(h);
    assert.ok(w.speed>0);
    assert.ok(Math.abs((next.x-a.x)/.0001-w.x)<.01);
    assert.ok(Math.abs((next.z-a.z)/.0001-w.z)<.01);
  }
  assert.ok(Math.abs(windAtHour(24).x-windAtHour(0).x)<1e-9);
  assert.ok(Math.abs(windDriftAtHour(24).z-windDriftAtHour(0).z)<1e-9);
  assert.equal(windDriftAtHour(24).x,windDriftAtHour(0).x);
});
test('same piece of terrain has distinct physical material types',()=>{
  const types=new Set();
  for(const c of makeTerrainCells()){
    const type=surfaceAt(c.x,c.z).kind;types.add(type);
    assert.ok(soilCapacityLiters(c.x,c.z)>0);
    assert.ok(infiltrationBudgetLiters(c.x,c.z,1)>0);
  }
  assert.deepEqual([...types].sort(),Object.keys(SURFACE).sort());
  assert.ok(SURFACE.sand.intakeMmPerHour>SURFACE.clay.intakeMmPerHour);
  assert.ok(SURFACE.organic.capacityMm>SURFACE.rock.capacityMm);
});
test('sun and wind increase evaporation while cloud shading reduces it',()=>{
  const midday=evaporationMmPerHour(12.5,0);
  const clouded=evaporationMmPerHour(12.5,1);
  const midnight=evaporationMmPerHour(0,0);
  assert.ok(midday>clouded && clouded>midnight);
  for(let h=0;h<24;h+=.1)assert.ok(evaporationMmPerHour(h,.5)>0);
});

test('visual material blending is smooth near borders without changing physical kind',async()=>{
  const { visualMaterialWeights } = await import('../src/surface-materials.ts');
  const atBorder=visualMaterialWeights(1.70,1.0);
  assert.ok(atBorder.sand>0 && atBorder.sand<1);
  const total=Object.values(atBorder).reduce((a,b)=>a+b,0);
  assert.ok(Math.abs(total-1)<1e-10);
  // Physics stays discrete on either side of the exact same geological seam.
  assert.notEqual(surfaceAt(1.69,1.0).kind,surfaceAt(1.71,1.0).kind);
  assert.ok(Math.abs(visualMaterialWeights(1.69,1.0).sand-
    visualMaterialWeights(1.71,1.0).sand)<.2);
});
