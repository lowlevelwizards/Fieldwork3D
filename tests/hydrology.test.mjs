import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWatershed, TerrainWater, solveWaterLevel, volumeAtLevel,
} from '../src/hydrology.ts';
import { makeTerrainCells, CELL_AREA } from '../src/terrain-model.ts';

const watershed=buildWatershed();

test('a downhill path always falls to an interior sink or map edge',()=>{
  assert.ok(watershed.basins.length>0 && watershed.basins.length<100);
  let interior=0,exterior=0;
  for(const cell of watershed.cells){
    const next=watershed.downhill[cell.index];
    if(next>=0)assert.ok(watershed.cells[next].height < cell.height-1e-8);
    if(watershed.cellBasin[cell.index]<0)exterior++;else interior++;
  }
  assert.equal(interior+exterior,watershed.cells.length);
  assert.ok(interior>0 && exterior>0);
});
test('each depression has a finite spilling level, outlet and nonnegative capacity',()=>{
  let capacity=0;
  for(const basin of watershed.basins){
    const bottom=watershed.cells[basin.sinkIndex].height;
    assert.ok(Number.isFinite(basin.spillLevel));
    assert.ok(basin.spillLevel>=bottom);
    assert.ok(basin.capacityLiters>=0);
    assert.ok(basin.outletId < watershed.basins.length);
    assert.ok(basin.routeDepth>=0);
    capacity+=basin.capacityLiters;
    let parent=basin.outletId, steps=0;
    while(parent>=0){
      assert.ok(++steps<=watershed.basins.length);
      parent=watershed.basins[parent].outletId;
    }
  }
  assert.ok(capacity>10);
});
test('water levels rise with volume and never exceed basin spill elevation',()=>{
  const b=watershed.basins.find(x=>x.capacityLiters>2);
  assert.ok(b);
  assert.equal(solveWaterLevel(watershed,b,0),null);
  const low=solveWaterLevel(watershed,b,b.capacityLiters*.2);
  const high=solveWaterLevel(watershed,b,b.capacityLiters*.8);
  assert.ok(low!==null&&high!==null&&low<high);
  assert.ok(high < b.spillLevel);
  assert.equal(solveWaterLevel(watershed,b,b.capacityLiters*2),b.spillLevel);
  assert.ok(Math.abs(volumeAtLevel(watershed,b,high)-b.capacityLiters*.8)<.005);
});
test('rain enters catchments, fills basins, and exports overflow without losing litres',()=>{
  const water=new TerrainWater(watershed);
  assert.equal(water.advance(12,0,1),0);
  for(let step=0;step<90;step++)water.advance(step*.20,.20,1);
  assert.ok(water.totalDepositedLiters()>5);
  assert.ok(water.totalLiters()>0);
  assert.ok(water.exportedLiters()>0);
  assert.ok(Math.abs(water.totalLiters()+water.exportedLiters()-water.totalDepositedLiters())<.00005);
  for(const b of watershed.basins)assert.ok(water.basinLiters(b.id)<=b.capacityLiters+1e-8);
});
test('dryness cannot remove standing water, and time scrub does not simulate time',()=>{
  const water=new TerrainWater(watershed);
  water.advance(5,3,1);
  const before=water.snapshot();
  assert.equal(water.advance(6,3,0),0);
  assert.ok(Math.abs(water.totalLiters()-before.basins.reduce((s,b)=>s+b.litres,0))<1e-8);
  assert.equal(water.advance(22,0,null),0);
  assert.deepEqual(water.snapshot(),before);
});
test('saved basin water and exported volume persist using stable sink identifiers',()=>{
  const water=new TerrainWater(watershed);
  water.advance(4,4,1);
  const second=new TerrainWater(buildWatershed(makeTerrainCells()),water.snapshot());
  assert.deepEqual(second.snapshot(),water.snapshot());
  second.clear();
  assert.equal(second.totalLiters(),0);
  assert.equal(second.exportedLiters(),0);
});
test('same rain integrated in small vs large steps produces near-identical totals',()=>{
  const a=new TerrainWater(watershed),b=new TerrainWater(watershed);
  a.advance(5,1,1);
  for(let i=0;i<50;i++)b.advance(5+i*.02,.02,1);
  assert.ok(a.totalDepositedLiters()>0);
  const relative=Math.abs(a.totalDepositedLiters()-b.totalDepositedLiters())/b.totalDepositedLiters();
  assert.ok(relative<.12);
});
test('the terrain topography grid has the expected exact 100 m2 footprint',()=>{
  assert.equal(watershed.cells.length,1024);
  assert.ok(Math.abs(CELL_AREA * watershed.cells.length-100)<1e-9);
});
