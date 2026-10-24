import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  visibleStream, streamWidth, flowCurvePoint, floodOpacity,
} from '../src/drainage-visual-model.ts';
import { TerrainWater } from '../src/hydrology.ts';
import {
  terrainHeight, localChannelProximity, makeTerrainCells,
} from '../src/terrain-model.ts';

test('surface sheet runoff does not generate individual blue stripes',()=>{
  assert.equal(visibleStream(.02,500,1),false);
  assert.equal(visibleStream(1,1,0),false);
  assert.equal(visibleStream(.7,5,0),false);
  assert.equal(visibleStream(.7,6,.5),true);
  assert.equal(visibleStream(.21,1,.9),true);
  assert.equal(visibleStream(.5,20,0),true);
  assert.equal(visibleStream(Number.NaN,100,1),false);
});

test('headwater streams are narrower than gathered valley channels',()=>{
  const small=streamWidth(.25,6);
  const large=streamWidth(12,100);
  assert.ok(small>.02 && small<.09);
  assert.ok(large>small);
  assert.ok(large<=.20);
  assert.equal(streamWidth(0,100),0);
});

test('river interpolation terminates exactly on routed cell centers',()=>{
  const previous={x:-2,z:-1},a={x:-1,z:0};
  const b={x:0,z:1},following={x:.3,z:2};
  assert.deepEqual(flowCurvePoint(previous,a,b,following,0),a);
  assert.deepEqual(flowCurvePoint(previous,a,b,following,1),b);
  const middle=flowCurvePoint(previous,a,b,following,.5);
  assert.ok(middle.x>-.7 && middle.x<.2);
  assert.ok(middle.z>0 && middle.z<1);
  assert.deepEqual(flowCurvePoint(previous,a,b,following,-1),a);
  assert.deepEqual(flowCurvePoint(previous,a,b,following,2),b);
});

test('overbank opacity fades to zero without inventing water',()=>{
  assert.equal(floodOpacity(0),0);
  assert.equal(floodOpacity(-1),0);
  assert.ok(floodOpacity(.01)>0);
  assert.ok(floodOpacity(.08)>floodOpacity(.01));
  assert.ok(floodOpacity(2)<=.78);
});

test('sculpted watershed keeps a readable north-south valley with natural tributaries',()=>{
  for(const z of [-4,-2,0,2,4]){
    const center=terrainHeight(0,z);
    assert.ok(terrainHeight(-4.8,z)-center>.15);
    assert.ok(terrainHeight(4.8,z)-center>.15);
  }
  assert.ok(terrainHeight(0,-4.7)>terrainHeight(0,4.7));
  assert.ok(localChannelProximity(0,0)>.5);
  // All numerical solver elevations are sampled from the same heightfield.
  for(const cell of makeTerrainCells()){
    assert.equal(terrainHeight(cell.x,cell.z),cell.height);
  }
});

test('water visuals read but never mutate the physical reservoirs',()=>{
  const water=new TerrainWater();
  water.advance(5,3,1);
  const before=water.snapshot();
  let actualLinks=0,visibleLinks=0;
  for(const cell of water.watershed.cells){
    if(water.watershed.downhill[cell.index]<0)continue;
    const volume=water.runoffLiters(cell.index);
    if(volume>0)actualLinks++;
    if(visibleStream(volume,water.watershed.flowAccumulation[cell.index],
      localChannelProximity(cell.x,cell.z)))visibleLinks++;
    streamWidth(volume,water.watershed.flowAccumulation[cell.index]);
    floodOpacity(water.floodLiters(cell.index)/100);
  }
  assert.ok(visibleLinks>0 && visibleLinks<actualLinks);
  assert.deepEqual(water.snapshot(),before);
  assert.ok(Math.abs(water.massBalanceError())<.0001);
});

test('flow rendering uses lit depth-feathered geometry, not debug graph edges',()=>{
  const src=readFileSync(new URL('../src/flow-field.ts',import.meta.url),'utf8');
  assert.match(src,/visibleStream\(/);
  assert.match(src,/extractChannelChains\(/);
  assert.match(src,/channelChainPoint\(/);
  assert.match(src,/floodDisplayDepth\(/);
  assert.match(src,/sampleDisplayMoisture\(/);
  assert.match(src,/Float32BufferAttribute\(colors,4\)/);
  assert.match(src,/new THREE\.MeshStandardMaterial\(/);
  assert.doesNotMatch(src,/ShaderMaterial|Math\.random\(/);
});
