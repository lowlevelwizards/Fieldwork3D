import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BASINS, StandingWater, PEAK_RAIN_MM_PER_HOUR,
  localRainExposure, surfaceFraction,
} from '../src/standing-water.ts';

test('all basins stay inside the existing 10m ground footprint', () => {
  assert.equal(BASINS.length,9);
  for (const b of BASINS) {
    assert.ok(Math.abs(b.x) + b.radiusX < 5);
    assert.ok(Math.abs(b.z) + b.radiusZ < 5);
    assert.ok(b.catchmentArea>0 && b.shapeLiters>0);
  }
  assert.ok(PEAK_RAIN_MM_PER_HOUR > 0);
});
test('rain adds actual stored litres, never subtracts it', () => {
  const water = new StandingWater();
  let cumulative = 0;
  for (let t=5;t<7;t+=.1) {
    const before = water.snapshot().volumesLiters;
    const added = water.advance(t,.1,1);
    const after = water.snapshot().volumesLiters;
    assert.ok(added >= 0);
    after.forEach((v,i)=>assert.ok(v >= before[i]));
    cumulative += added;
  }
  assert.ok(cumulative > .5,'heavy cloud rain should form puddles');
  assert.ok(Math.abs(water.totalLiters()-cumulative)<1e-7);
});
test('dry conditions and paused time do not create puddles', () => {
  const water = new StandingWater();
  assert.equal(water.advance(6,4,0),0);
  assert.equal(water.totalLiters(),0);
  assert.equal(water.advance(6,0,1),0);
  assert.equal(water.totalLiters(),0);
  assert.equal(water.advance(6,-1,1),0);
});
test('rain is spatially local under moving cloud formations', () => {
  const b = BASINS[0];
  let sampled = 0;
  let dry = 0;
  for (let t=0;t<24;t+=.035) {
    const value = localRainExposure(b,t,1);
    assert.ok(value>=0 && value<=1);
    if(value>.05)sampled++;
    if(value===0)dry++;
  }
  assert.ok(sampled>0 && dry>0);
});
test('puddle surface expands as deposited quantity grows', () => {
  const b=BASINS[0];
  assert.equal(surfaceFraction(0,b),0);
  assert.ok(surfaceFraction(2,b)<surfaceFraction(8,b));
  assert.equal(surfaceFraction(b.shapeLiters,b),1);
  assert.equal(surfaceFraction(1000,b),1);
});
test('volume persists through snapshots and time scrubbing does not rewrite history', () => {
  const a=new StandingWater();
  a.advance(5.2,3.3,1);
  const snapshot=a.snapshot();
  const b=new StandingWater(snapshot.volumesLiters);
  assert.deepEqual(a.snapshot(),b.snapshot());
  assert.deepEqual(a.snapshot(),snapshot);
  b.advance(0,0,null); // a seek without elapsed time
  assert.deepEqual(b.snapshot(),snapshot);
  b.clear();
  assert.equal(b.totalLiters(),0);
  assert.ok(a.totalLiters()>0);
});
test('substeps preserve local rainfall accumulation across large vs small steps', () => {
  const large=new StandingWater();
  const small=new StandingWater();
  large.advance(5,1,1);
  for(let i=0;i<50;i++)small.advance(5+i*.02,.02,1);
  assert.ok(large.totalLiters()>0 && small.totalLiters()>0);
  const relative=Math.abs(large.totalLiters()-small.totalLiters())/small.totalLiters();
  assert.ok(relative<.15, `rain integration unexpectedly differs by ${relative}`);
});
