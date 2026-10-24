import test from 'node:test';
import assert from 'node:assert/strict';
import { TerrainWater } from '../src/hydrology.ts';
import { surfaceAt } from '../src/surface-materials.ts';
import {
  GroundLoad, evaluateTraffic, STRENGTH, LOADS, MAX_RUT_DEPTH_M,
} from '../src/traffic-model.ts';

test('wet clay penalizes heavy vehicles more than foot traffic',()=>{
  const fd=evaluateTraffic('clay',0,0,2,0,'foot');
  const fw=evaluateTraffic('clay',1,0,2,0,'foot');
  const vd=evaluateTraffic('clay',0,0,2,0,'vehicle');
  const vw=evaluateTraffic('clay',1,0,2,0,'vehicle');
  assert.ok(vw.speedFactor<vd.speedFactor*.45);
  assert.ok(fw.speedFactor>vw.speedFactor);
  assert.ok(fw.speedFactor>.15 && fw.speedFactor<fd.speedFactor);
  assert.ok(vw.mud>.9);
});

test('wet rock loses traction, cannot form mud or ruts',()=>{
  const dry=evaluateTraffic('rock',0,0,0,0,'foot');
  const wet=evaluateTraffic('rock',1,0,0,0,'foot');
  assert.equal(wet.mud,0);
  assert.ok(wet.bearingKPa>LOADS.vehicle.pressureKPa);
  assert.ok(wet.traction<dry.traction);
  assert.equal(STRENGTH.rock.deformability,0);
});

test('ruts, saturation, slope and standing water reduce mobility',()=>{
  for(const kind of Object.keys(STRENGTH)){
    const dry=evaluateTraffic(kind,0,0,0,0,'vehicle');
    const wet=evaluateTraffic(kind,1,0,0,0,'vehicle');
    const rut=evaluateTraffic(kind,1,0,0,MAX_RUT_DEPTH_M,'vehicle');
    const slope=evaluateTraffic(kind,0,0,20,0,'vehicle');
    assert.ok(dry.speedFactor>=wet.speedFactor-1e-8);
    assert.ok(rut.speedFactor<=wet.speedFactor+1e-8);
    assert.ok(slope.speedFactor<dry.speedFactor);
    assert.ok(wet.bearingKPa<=dry.bearingKPa);
    assert.ok(wet.traction<=dry.traction);
    assert.equal(evaluateTraffic(kind,0,.4,0,0,'foot').speedFactor,0);
    assert.equal(evaluateTraffic(kind,0,.4,0,0,'vehicle').speedFactor,0);
  }
});

test('heavy load leaves more and deeper ruts on saturated clay than dry',()=>{
  const water=new TerrainWater();
  const index=water.watershed.cells.find(c=>surfaceAt(c.x,c.z).kind==='clay')?.index;
  assert.ok(index!==undefined);
  const ctx=(wet)=>({
    watershed:water.watershed,
    soilFraction:()=>wet,
    surfaceLevel:()=>null,
  });
  const dry=new GroundLoad(),soaked=new GroundLoad();
  const before=water.snapshot();
  const a=dry.pass(index,ctx(0),'vehicle');
  const b=soaked.pass(index,ctx(1),'vehicle',Math.PI/2);
  assert.ok(b>a);
  assert.equal(soaked.rutAngles[index],Math.PI/2);
  for(let i=0;i<60;i++)soaked.pass(index,ctx(1),'vehicle');
  assert.ok(soaked.rutDepths[index]<=MAX_RUT_DEPTH_M);
  assert.ok(soaked.rutDepths[index]>.025);
  assert.deepEqual(water.snapshot(),before);
});

test('drying gradually repairs ruts, rather than resetting them',()=>{
  const water=new TerrainWater();
  const index=water.watershed.cells.find(c=>surfaceAt(c.x,c.z).kind==='clay')?.index;
  assert.ok(index!==undefined);
  const ground=new GroundLoad();
  const ctx=(wet)=>({
    watershed:water.watershed,
    soilFraction:()=>wet,
    surfaceLevel:()=>null,
  });
  for(let i=0;i<10;i++)ground.pass(index,ctx(1),'vehicle');
  const before=ground.rutDepths[index];
  assert.ok(before>.01);
  ground.advance(24,ctx(1));
  const wetValue=ground.rutDepths[index];
  ground.advance(24,ctx(0));
  const dryValue=ground.rutDepths[index];
  assert.ok(before>wetValue && wetValue>dryValue && dryValue>0);
});

test('passage preserves actual hydrology and mass balance',()=>{
  const water=new TerrainWater();
  water.advance(5,1,1);
  const before=water.snapshot();
  const ground=new GroundLoad();
  for(let i=0;i<150;i++)ground.pass((i*13)%1024,water,i%2?'foot':'vehicle',i/4);
  ground.advance(.75,water);
  assert.deepEqual(water.snapshot(),before);
  assert.ok(Math.abs(water.massBalanceError())<.0001);
});

test('tracks persist across reload and clear independently of water',()=>{
  const water=new TerrainWater();
  const index=water.watershed.cells.find(c=>surfaceAt(c.x,c.z).kind==='clay')?.index;
  assert.ok(index!==undefined);
  const ctx={watershed:water.watershed,soilFraction:()=>1,surfaceLevel:()=>null};
  const original=new GroundLoad();
  original.pass(index,ctx,'vehicle',1.25);
  const reloaded=new GroundLoad(original.snapshot());
  assert.deepEqual(reloaded.snapshot(),original.snapshot());
  reloaded.clear();
  assert.ok(reloaded.rutDepths.every(d=>d===0));
  assert.ok(reloaded.rutAngles.every(a=>a===0));
  assert.ok(original.rutDepths[index]>0);
  const corrupt=new GroundLoad({
    rutDepths:Array(1024).fill(9000),
    rutAngles:Array(1024).fill(Number.NaN),
  });
  assert.ok(corrupt.rutDepths.every(d=>d===MAX_RUT_DEPTH_M));
  assert.ok(corrupt.rutAngles.every(a=>a===0));
});

test('repeated observations are deterministic for an unchanged world',()=>{
  const water=new TerrainWater(),load=new GroundLoad();
  for(let i=0;i<1024;i+=37){
    const a=load.observe(i,water,'vehicle');
    assert.deepEqual(a,load.observe(i,water,'vehicle'));
    assert.ok(a.speedFactor>=0 && a.speedFactor<=1);
    assert.ok(['firm','slow','difficult','blocked'].includes(a.condition));
  }
});
