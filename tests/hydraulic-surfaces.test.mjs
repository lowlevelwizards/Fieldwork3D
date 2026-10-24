import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  hydraulicSection, channelVolumeAtDepth, channelCapacity,
  channelDepthForLitres, hydraulicStage, channelWettedWidth,
} from '../src/hydraulic-section.ts';
import { buildWatershed, TerrainWater } from '../src/hydrology.ts';
import { selectVisibleRiverLinks } from '../src/visible-rivers.ts';
import { CELL_AREA } from '../src/terrain-model.ts';

const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} versus ${b}`);

test('channel section grows from headwater to trunk while staying inside the local grid',()=>{
  const little=hydraulicSection(8,true),big=hydraulicSection(200,true);
  assert.ok(big.bottomWidthM>little.bottomWidthM);
  assert.ok(big.bankWidthM>little.bankWidthM);
  assert.ok(big.bankHeightM>=little.bankHeightM);
  assert.ok(big.bankWidthM<1);
  assert.ok(channelCapacity(big)>channelCapacity(little));
});

test('conserved litres fill cross-section continuously and reversibly',()=>{
  const section=hydraulicSection(90,true);
  const cap=channelCapacity(section);
  near(channelVolumeAtDepth(section,section.bankHeightM),cap);
  assert.equal(channelDepthForLitres(section,0),0);
  for(const factor of [.05,.2,.5,.85,.99]){
    const litres=cap*factor;
    const stage=channelDepthForLitres(section,litres);
    near(channelVolumeAtDepth(section,stage),litres,1e-8);
    assert.ok(stage>0&&stage<section.bankHeightM);
  }
  near(hydraulicStage(section,cap,0),section.bankHeightM);
  near(hydraulicStage(section,cap,20),section.bankHeightM+20/(CELL_AREA*1000));
  assert.ok(channelWettedWidth(section,section.bankHeightM+.12)>
    channelWettedWidth(section,section.bankHeightM));
  assert.ok(channelWettedWidth(section,section.bankHeightM*.75)>
    channelWettedWidth(section,section.bankHeightM*.2));
  near(hydraulicStage(section,cap,0),hydraulicStage(section,cap,0));
});

test('nonchannel sheet water uses cell area, rather than pretending to be a stream',()=>{
  const section=hydraulicSection(1,false);
  near(hydraulicStage(section,5,3),8/(CELL_AREA*1000));
  near(channelCapacity(section),CELL_AREA*1000*.012);
  assert.equal(channelWettedWidth(section,0),0);
});

test('real water ledger exposes increasing stages and widths, including flood storage',()=>{
  const watershed=buildWatershed();
  const cell=watershed.cells.find(c=>watershed.channels[c.index]&&
    watershed.flowAccumulation[c.index]>=12);
  assert.ok(cell);
  const i=cell.index;
  const reference=new TerrainWater(watershed);
  const cap=reference.channelCapacityLiters(i);
  const saved=(river,flood)=>({
    basins:[],exportedLiters:0,totalDepositedLiters:river+flood,
    runoffLiters:watershed.cells.map(c=>c.index===i?river:0),
    floodLiters:watershed.cells.map(c=>c.index===i?flood:0),
  });
  const low=new TerrainWater(watershed,saved(cap*.2,0));
  const high=new TerrainWater(watershed,saved(cap*.95,0));
  const over=new TerrainWater(watershed,saved(cap,12));
  assert.ok(low.channelStageAtCell(i)<high.channelStageAtCell(i));
  assert.ok(high.channelStageAtCell(i)<over.channelStageAtCell(i));
  assert.ok(low.channelWettedWidthAtCell(i)<high.channelWettedWidthAtCell(i));
  assert.ok(high.channelWettedWidthAtCell(i)<over.channelWettedWidthAtCell(i));
  assert.ok(over.waterSurfaceElevationAtCell(i)>high.waterSurfaceElevationAtCell(i));
  for(const water of [low,high,over]){
    assert.ok(Math.abs(water.massBalanceError())<1e-6);
  }
});

test('true depressions still pond level with litres and eventually overflow',()=>{
  const watershed=buildWatershed();
  const basin=watershed.basins.find(b=>b.capacityLiters>1);
  assert.ok(basin);
  const saved=v=>({
    basins:[{sinkIndex:basin.sinkIndex,litres:v}],
    exportedLiters:0,totalDepositedLiters:v,
  });
  const low=new TerrainWater(watershed,saved(basin.capacityLiters*.2));
  const high=new TerrainWater(watershed,saved(basin.capacityLiters*.8));
  const lowLevel=low.surfaceLevel(basin.id),highLevel=high.surfaceLevel(basin.id);
  assert.ok(lowLevel!==null&&highLevel!==null&&highLevel>lowLevel);
  assert.ok(highLevel<=basin.spillLevel);
  const overflow=new TerrainWater(watershed,saved(basin.capacityLiters+3));
  assert.ok(overflow.exportedLiters()+overflow.totalPondLiters()>=basin.capacityLiters);
  assert.ok(Math.abs(overflow.massBalanceError())<1e-5);
});

test('short weak tributary teeth are hidden without modifying downhill routing',()=>{
  const n=5,downhill=Array(25).fill(-1),active=Array(25).fill(false);
  const accumulation=Array(25).fill(5);
  const edge=(a,b)=>{downhill[a]=b;active[a]=true;};
  edge(6,7);edge(7,8);edge(8,13);
  edge(11,12);edge(12,13);
  edge(19,13);
  const before=downhill.slice();
  const chosen=selectVisibleRiverLinks(downhill,active,accumulation,n);
  assert.equal(chosen[6],true);
  assert.equal(chosen[7],true);
  assert.equal(chosen[8],true);
  assert.equal(chosen[11],false);
  assert.equal(chosen[12],false);
  assert.equal(chosen[19],true,'world-edge stream continues');
  assert.deepEqual(downhill,before);
  const withPond=Array(25).fill(false);
  withPond[12]=true;
  const pond=selectVisibleRiverLinks(downhill,active,accumulation,n,withPond);
  assert.equal(pond[11],true,'a real pond mouth keeps its tributary');
});

test('heavy rain preserves water mass and lets flooded channel water re-enter',()=>{
  const water=new TerrainWater();
  for(let t=0;t<7;t+=.2)water.advance(t,.2,1);
  assert.ok(water.totalLiters()>0);
  assert.ok(water.totalFloodLiters()>=0);
  const state=water.snapshot();
  const restored=new TerrainWater(undefined,state);
  assert.deepEqual(restored.snapshot(),state);
  for(let t=7;t<10;t+=.2)restored.advance(t,.2,0);
  assert.ok(restored.totalChannelLiters()>=0);
  assert.ok(Math.abs(restored.massBalanceError())<.0001);
});

test('the production scene uses one volume-driven water surface, not three overlapping layers',()=>{
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  const src=readFileSync(new URL('../src/hydraulic-surface-field.ts',import.meta.url),'utf8');
  assert.ok(main.includes('new HydraulicSurfaceField(scene)'));
  assert.ok(!main.includes('new PuddleField(scene)'));
  assert.ok(!main.includes('new FlowField(scene)'));
  assert.ok(src.includes('selectVisibleRiverLinks('));
  assert.ok(src.includes('water.channelWettedWidthAtCell('));
  assert.ok(src.includes('water.surfaceLevel('));
  assert.ok(src.includes('clipWaterTriangle('));
  assert.ok(src.includes('water.floodLiters('));
  assert.ok(!src.includes('floodDisplayDepth('));
  assert.ok(src.includes('new THREE.MeshStandardMaterial('));
  assert.ok(src.includes('Float32BufferAttribute(rgba,4)'));
  assert.ok(!src.includes('Math.random('));
});
