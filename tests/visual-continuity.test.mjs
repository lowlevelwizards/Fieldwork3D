import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  extractChannelChains, smoothChannelProfile, channelChainPoint,
  streamWidth,
} from '../src/drainage-visual-model.ts';
import {
  smoothDisplayField, smoothDisplayFieldPreserveEdges,
  composeDisplayWetness, floodDisplayDepth, sampleDisplayMoisture,
} from '../src/terrain-display-model.ts';
import { TerrainWater } from '../src/hydrology.ts';
import { CELL_SIZE, WORLD_HALF } from '../src/terrain-model.ts';

test('one continuous main stream and connected tributaries cover each live link once',()=>{
  // 0,1 -> 2 -> 3 -> 4(outlet), and 6 -> 5 -> 3.
  const downstream=[2,2,3,4,-1,3,5];
  const active=[true,true,true,true,false,true,true];
  const contributing=[5,3,8,14,14,2,1];
  const chains=extractChannelChains(downstream,active,contributing);
  assert.deepEqual(chains,[[0,2,3,4],[1,2],[6,5,3]]);
  const edges=chains.flatMap(chain=>chain.slice(0,-1).map((v,i)=>
    [v,chain[i+1]].join('>')));
  assert.equal(new Set(edges).size,edges.length);
  assert.deepEqual(new Set(edges),new Set(['0>2','1>2','2>3','3>4','5>3','6>5']));
  assert.throws(()=>extractChannelChains([1],[true,false],[1]),/matching/);
});

test('path spline shares exact coordinates at cell boundaries, without random offsets',()=>{
  const p=[{x:-2,z:-2},{x:-1,z:-1},{x:-.7,z:0},{x:0,z:1}];
  for(let seg=0;seg<p.length-2;seg++){
    assert.deepEqual(channelChainPoint(p,seg,1),channelChainPoint(p,seg+1,0));
  }
  assert.deepEqual(channelChainPoint(p,0,0),p[0]);
  assert.deepEqual(channelChainPoint(p,p.length-2,1),p.at(-1));
});

test('river width is continuous along chains and retains stream hierarchy',()=>{
  const widths=[.035,.06,.19,.07,.04];
  const smoothed=smoothChannelProfile(widths);
  assert.equal(smoothed.length,widths.length);
  assert.ok(smoothed[2]<widths[2]);
  assert.ok(smoothed[1]>widths[1]);
  assert.ok(Math.max(...smoothed)<.19);
  assert.deepEqual(smoothChannelProfile([.1,.1,.1]),[.1,.1,.1]);
  assert.ok(streamWidth(20,120)>streamWidth(.3,7));
});

test('broad wetness remains continuous and cannot alter source samples',()=>{
  const n=9,field=new Float32Array(n*n);
  field[4*n+4]=1;
  const original=Float32Array.from(field);
  const soft=smoothDisplayField(field,n,2);
  assert.deepEqual(field,original);
  assert.ok(soft[4*n+4]>0 && soft[4*n+4]<.2);
  assert.ok(soft[4*n+3]>0);
  assert.equal(soft[0],0);
  assert.throws(()=>smoothDisplayField(field,n,-1),/pass/);
});

test('edge-aware filtering merges a floodplain but protects a physical ridge',()=>{
  const n=9,physical=new Float32Array(n*n);
  const flat=new Float32Array(n*n);
  const ridge=new Float32Array(n*n);
  for(let row=0;row<n;row++)for(let col=0;col<n;col++){
    physical[row*n+col]=col<=3?.04:0;
    ridge[row*n+col]=col<=3?0:1;
  }
  const unguarded=smoothDisplayFieldPreserveEdges(physical,flat,n,2);
  const guarded=floodDisplayDepth(physical,ridge,n);
  const right=4*n+4;
  assert.ok(unguarded[right]>.001);
  assert.ok(guarded[right]<unguarded[right]*.02);
  for(const depth of guarded)assert.ok(depth>=0 && depth<=.04+1e-5);
  const worldX=-WORLD_HALF+(4.5)*CELL_SIZE;
  const worldZ=-WORLD_HALF+(4.5)*CELL_SIZE;
  assert.ok(Number.isFinite(sampleDisplayMoisture(guarded,worldX,worldZ,n)));
});

test('uniform visual fields preserve values through boundaries and smoothing',()=>{
  const n=9;
  const flat=new Float32Array(n*n);
  for(const fraction of [0,.2,.8,1]){
    const constant=new Float32Array(n*n).fill(fraction);
    const result=smoothDisplayFieldPreserveEdges(constant,flat,n,3);
    for(const cell of result)assert.ok(Math.abs(cell-fraction)<1e-6);
  }
});

test('independent soil, runoff and flood visual layers do not generate water',()=>{
  const water=new TerrainWater();
  water.advance(5,2,1);
  const before=water.snapshot();
  const cells=water.watershed.cells;
  const n=Math.sqrt(cells.length);
  const soil=Float32Array.from(cells,c=>water.soilFraction(c.index));
  const flow=Float32Array.from(cells,c=>water.runoffLiters(c.index)/100);
  const flood=Float32Array.from(cells,c=>water.floodLiters(c.index)/100);
  const elevations=Float32Array.from(cells,c=>c.height);
  const visual=composeDisplayWetness(soil,flow,flood,elevations,n);
  assert.equal(visual.length,cells.length);
  assert.ok(visual.every(value=>value>=0&&value<=1));
  assert.deepEqual(water.snapshot(),before);
  assert.ok(Math.abs(water.massBalanceError())<1e-4);
});

test('flow renderer uses cohesive water paths and a finer shared flood field',()=>{
  const src=readFileSync(new URL('../src/flow-field.ts',import.meta.url),'utf8');
  assert.ok(src.includes('extractChannelChains('));
  assert.ok(src.includes('smoothChannelProfile('));
  assert.ok(src.includes('channelChainPoint('));
  assert.ok(src.includes('floodDisplayDepth('));
  assert.ok(src.includes('const resolution=n*3'));
  assert.ok(src.includes('Float32BufferAttribute(floodColors,4)'));
  assert.ok(!src.includes('Math.random('));
  const terrain=readFileSync(new URL('../src/terrain.ts',import.meta.url),'utf8');
  assert.ok(terrain.includes('composeDisplayWetness('));
});
