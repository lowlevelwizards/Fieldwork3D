import test from 'node:test';
import assert from 'node:assert/strict';
import {
  smoothDisplayMoisture, sampleDisplayMoisture,
  reliefBrightness, displayWetnessWeight,
} from '../src/terrain-display-model.ts';
import { CELL_SIZE, WORLD_HALF } from '../src/terrain-model.ts';
import { TerrainWater } from '../src/hydrology.ts';
import { surfaceAt, visualMaterialWeights } from '../src/surface-materials.ts';

const n=32;
const xy=(col,row)=>({
  x:-WORLD_HALF+(col+.5)*CELL_SIZE,
  z:-WORLD_HALF+(row+.5)*CELL_SIZE,
});

test('uniform dryness or saturation stays uniform, including map boundaries',()=>{
  for (const value of [0,.25,.6,1]) {
    const cells=new Float32Array(n*n).fill(value);
    const display=smoothDisplayMoisture(cells,n);
    for(const result of display)assert.ok(Math.abs(result-value)<1e-6);
    for(let z=-5;z<=5;z+=.25){
      assert.ok(Math.abs(sampleDisplayMoisture(display,-5,z,n)-value)<1e-6);
      assert.ok(Math.abs(sampleDisplayMoisture(display,5,z,n)-value)<1e-6);
    }
  }
});

test('single wet cell becomes a continuous, lower-contrast visual gradient',()=>{
  const raw=new Float32Array(n*n);
  raw[16*n+16]=1;
  const original=Float32Array.from(raw);
  const smooth=smoothDisplayMoisture(raw,n);
  assert.deepEqual(raw,original,'display smoothing must never edit source data');
  assert.ok(smooth[16*n+16]<.20);
  assert.ok(smooth[16*n+16]>.05);
  assert.ok(smooth[16*n+15]>0 && smooth[15*n+16]>0);
  assert.equal(smooth[0],0);
  const a=xy(16,16),b=xy(17,16);
  const midwayX=(a.x+b.x)*.5;
  const sampled=sampleDisplayMoisture(smooth,midwayX,a.z,n);
  assert.ok(Math.abs(sampled-(smooth[16*n+16]+smooth[16*n+17])*.5)<1e-6);
  // Both the center and shared corner sample the identical display field.
  assert.ok(sampleDisplayMoisture(smooth,midwayX,a.z,n)>0);
});

test('relief and water-stain strengths remain restrained',()=>{
  for(let local=-.2;local<=.2;local+=.01)for(let other=-.2;other<=.2;other+=.03){
    const shade=reliefBrightness(local,other);
    assert.ok(shade>=.96 && shade<=1.01);
  }
  assert.equal(displayWetnessWeight(0),0);
  assert.equal(displayWetnessWeight(1),.75);
  assert.ok(displayWetnessWeight(.5)>0 && displayWetnessWeight(.5)<.75);
});

test('broader visual material blending does not change a physical soil category',()=>{
  const x=1.7,z=1;
  const left=visualMaterialWeights(x-.1,z).sand;
  const right=visualMaterialWeights(x+.1,z).sand;
  assert.ok(Math.abs(right-left)<.33);
  for(let x=-4.5;x<=4.5;x+=.3)for(let z=-4.5;z<=4.5;z+=.3){
    const before=surfaceAt(x,z).kind;
    const weights=visualMaterialWeights(x,z);
    assert.equal(before,surfaceAt(x,z).kind);
    assert.ok(Object.values(weights).every(w=>w>=0 && w<=1));
    assert.ok(Math.abs(Object.values(weights).reduce((s,w)=>s+w,0)-1)<1e-8);
  }
});

test('render-only moisture reading cannot modify conserved water state',()=>{
  const water=new TerrainWater();
  water.advance(5,1,1);
  const before=water.snapshot();
  const fractions=Float32Array.from({length:n*n},(_,i)=>water.soilFraction(i));
  const smooth=smoothDisplayMoisture(fractions,n);
  for(let i=0;i<smooth.length;i++){
    const c=xy(i%n,Math.floor(i/n));
    sampleDisplayMoisture(smooth,c.x,c.z,n);
  }
  assert.deepEqual(water.snapshot(),before);
  assert.ok(Math.abs(water.massBalanceError())<.0001);
});
