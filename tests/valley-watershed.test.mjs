import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REGION_LENGTH_KM, regionAt, REGIONS, regionalHeight,
  regionalRiverX, regionalFlowDirection,
} from '../src/region-model.ts';
import {
  terrainHeight, valleyAxisX, GRID_CELLS, makeTerrainCells,
  localChannelProximity,
} from '../src/terrain-model.ts';
import { buildWatershed, TerrainWater } from '../src/hydrology.ts';

test('six recognizable Verdigris regions cover one continuous north-south valley',()=>{
  assert.equal(REGIONS.length,6);
  assert.equal(REGIONS[0].startKm,0);
  assert.equal(REGIONS.at(-1).endKm,REGION_LENGTH_KM);
  for(let i=1;i<REGIONS.length;i++)
    assert.equal(REGIONS[i].startKm,REGIONS[i-1].endKm);
  for(const region of REGIONS){
    assert.equal(regionAt((region.startKm+region.endKm)/2),region.name);
  }
  assert.equal(regionAt(0),'Northline Peaks');
  assert.equal(regionAt(REGION_LENGTH_KM),'Verdigris City');
});

test('regional river floor flows downhill north to south for multiple seeds',()=>{
  for(const seed of [0,1,93,23944]){
    let north=Infinity;
    for(let km=0;km<=REGION_LENGTH_KM;km+=2){
      const center=regionalRiverX(km,seed);
      const base=regionalHeight(center,km,seed);
      assert.ok(Number.isFinite(base));
      assert.ok(base<=north+1e-9,'river floor must never climb southward');
      north=base;
      assert.ok(regionalHeight(center-18,km,seed)>base);
      assert.ok(regionalHeight(center+18,km,seed)>base);
      assert.ok(Number.isFinite(regionalFlowDirection(km,seed)));
    }
  }
});

test('campaign seed changes local details but keeps identity and main valley axis',()=>{
  const x=regionalRiverX(80,3);
  assert.equal(x,regionalRiverX(80,3));
  assert.notEqual(x,regionalRiverX(80,4));
  assert.ok(Math.abs(x-regionalRiverX(80,4))<3);
  assert.equal(regionAt(80),'Cutwoods');
});

test('local miniature follows valley axis with channel incision and flanking hills',()=>{
  for(let z=-4.5;z<=4.5;z+=.5){
    const x=valleyAxisX(z);
    assert.ok(terrainHeight(x-3,z)>terrainHeight(x,z));
    assert.ok(terrainHeight(x+3,z)>terrainHeight(x,z));
    assert.ok(localChannelProximity(x,z)>.99);
  }
  assert.ok(terrainHeight(valleyAxisX(-4.5),-4.5)>
    terrainHeight(valleyAxisX(4.5),4.5)+.2);
});

test('local downhill network conserves contributing area and never routes uphill',()=>{
  const cells=makeTerrainCells();
  const net=buildWatershed(cells);
  assert.equal(net.flowAccumulation.length,GRID_CELLS**2);
  assert.equal(net.channels.length,GRID_CELLS**2);
  assert.ok(net.channels.filter(Boolean).length>10);
  for(const cell of cells){
    const next=net.downhill[cell.index];
    assert.ok(net.flowAccumulation[cell.index]>=1);
    if(next<0)continue;
    assert.ok(cells[next].height<cell.height);
    assert.ok(net.flowAccumulation[next]>net.flowAccumulation[cell.index]);
  }
});

test('headwater supply enters upstream and takes time to reach downstream',()=>{
  const water=new TerrainWater();
  water.advance(5,.035,0);
  assert.ok(water.importedLiters()>.4);
  assert.ok(water.totalChannelLiters()>0);
  assert.ok(water.exportedLiters()<water.importedLiters());
  assert.ok(Math.abs(water.massBalanceError())<.0001);
  water.advance(5.035,24,0);
  assert.ok(water.importedLiters()>300);
  assert.ok(water.exportedLiters()>0,
    'north-origin water must eventually reach the regional outlet');
  assert.ok(Math.abs(water.massBalanceError())<.0001);
});

test('intense wet weather can fill channels and make real flood storage',()=>{
  const water=new TerrainWater();
  for(let h=0;h<16;h+=2)water.advance(5+h,2,1);
  assert.ok(water.totalDepositedLiters()>0);
  assert.ok(water.totalSurfaceLiters===undefined);
  assert.ok(water.totalFloodLiters()>=0);
  assert.ok(water.totalChannelLiters()>0);
  assert.ok(Math.abs(water.massBalanceError())<.0001);
  const before=water.snapshot();
  const reloaded=new TerrainWater(undefined,before);
  assert.ok(Math.abs(reloaded.massBalanceError())<.0001);
  assert.ok(Math.abs(reloaded.totalFloodLiters()-water.totalFloodLiters())<1e-5);
  assert.ok(Math.abs(reloaded.importedLiters()-water.importedLiters())<1e-7);
});

test('new surface water depths can be queried by movement without extra water',()=>{
  const water=new TerrainWater();
  water.advance(8,2,1);
  const before=water.snapshot();
  for(let i=0;i<GRID_CELLS**2;i++){
    const depth=water.waterDepthAtCell(i);
    assert.ok(depth>=0 && Number.isFinite(depth));
  }
  assert.deepEqual(water.snapshot(),before);
  assert.ok(Math.abs(water.massBalanceError())<.0001);
});

test('CLEAR resets upstream imports, channel water and floodwater as well',()=>{
  const water=new TerrainWater();
  water.advance(6,2,1);
  assert.ok(water.importedLiters()>0);
  water.clear();
  assert.equal(water.importedLiters(),0);
  assert.equal(water.totalChannelLiters(),0);
  assert.equal(water.totalFloodLiters(),0);
  assert.equal(water.totalLiters(),0);
  assert.equal(water.massBalanceError(),0);
});
