import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PLAYABLE_REGIONS,PLAYABLE_LENGTH_M,PLAYABLE_REGION_SIZE_M,
  globalSouthM,localSouthZ,regionRiverX,valleyFloorM,
  regionAtSouthM,regionLocalHeightM,regionSlopeDegrees,
  regionalHeightM,riverBedDepthM,playableRegion,
} from '../src/playable-region-model.ts';
import {
  coarseHeightAt,tileHeightAt,makeRegionTile,
  REGION_COARSE_STEP_M,REGION_TILE_SIZE_M,
  REGION_TILES_PER_SIDE,REGION_FINE_SEGMENTS,
  RegionalTerrainField,
} from '../src/regional-terrain.ts';
import * as THREE from 'three';

test('six 1km2 regions follow one uninterrupted six-kilometre southward chain',()=>{
  assert.equal(PLAYABLE_REGIONS.length,6);
  assert.equal(PLAYABLE_REGION_SIZE_M,1000);
  assert.equal(PLAYABLE_LENGTH_M,6000);
  assert.deepEqual(PLAYABLE_REGIONS.map(r=>r.id),[
    'northline','timberline','cutwoods','breadlands','flooded-belt','verdigris-city',
  ]);
  assert.deepEqual(PLAYABLE_REGIONS.map(r=>r.implemented),
    [false,false,true,false,false,false]);
  for(let i=0;i<PLAYABLE_REGIONS.length;i++){
    const r=PLAYABLE_REGIONS[i];
    assert.equal(r.index,i);
    assert.equal(r.startSouthM,i*1000);
    assert.equal(r.endSouthM,r.startSouthM+1000);
    assert.equal(r.north,i?PLAYABLE_REGIONS[i-1].id:null);
    assert.equal(r.south,i<5?PLAYABLE_REGIONS[i+1].id:null);
    assert.equal(globalSouthM(r.id,-500),r.startSouthM);
    assert.equal(globalSouthM(r.id,500),r.endSouthM);
    assert.equal(localSouthZ(r.id,r.startSouthM),-500);
    assert.equal(localSouthZ(r.id,r.endSouthM),500);
    assert.equal(regionAtSouthM(i*1000+500).id,r.id);
    assert.equal(playableRegion(r.id).id,r.id);
  }
  assert.equal(regionAtSouthM(6000).id,'verdigris-city');
});
test('the shared river, floor and height meet exactly at every neighboring border',()=>{
  for(let i=0;i<5;i++){
    const a=PLAYABLE_REGIONS[i],b=PLAYABLE_REGIONS[i+1];
    assert.equal(globalSouthM(a.id,500),globalSouthM(b.id,-500));
    for(const seed of [0,31,520]){
      const south=globalSouthM(a.id,500);
      assert.equal(regionRiverX(south,seed),regionRiverX(south,seed));
      for(let x=-500;x<=500;x+=25){
        assert.equal(regionLocalHeightM(a.id,x,500,seed),
          regionLocalHeightM(b.id,x,-500,seed));
        assert.equal(regionLocalHeightM(a.id,x,500,seed),
          regionalHeightM(x,south,seed));
      }
    }
  }
});
test('the main river flows toward the southern coast across all six regions',()=>{
  assert.equal(valleyFloorM(6000),0);
  for(let s=0;s<6000;s+=10){
    assert.ok(valleyFloorM(s)>=valleyFloorM(s+10));
    const center=regionRiverX(s);
    const depth=riverBedDepthM(center,s);
    assert.ok(depth>1.9);
    assert.ok(Number.isFinite(regionalHeightM(center,s)));
  }
});
test('the Cutwoods kilometre has a meaningful valley, ridges and slopes',()=>{
  const id='cutwoods';
  const center=regionRiverX(2500);
  const floor=regionLocalHeightM(id,center,0);
  const rim=Math.max(regionLocalHeightM(id,-450,0),
    regionLocalHeightM(id,450,0));
  assert.ok(rim-floor>50,'uplands must stand above the actual valley floor');
  assert.ok(regionLocalHeightM(id,0,-500)>regionLocalHeightM(id,0,500));
  for(let z=-500;z<=500;z+=90)
    for(let x=-500;x<=500;x+=90){
      const h=regionLocalHeightM(id,x,z);
      const slope=regionSlopeDegrees(id,x,z);
      assert.ok(Number.isFinite(h)&&Number.isFinite(slope));
      assert.ok(slope>=0&&slope<90);
    }
});
test('all coarse regional terrain and near-detail sample heights share one lattice',()=>{
  const id='cutwoods',seed=31;
  const left={col:3,row:4},right={col:4,row:4};
  const sharedX=-500+4*REGION_TILE_SIZE_M;
  for(let k=0;k<=64;k++){
    const z=-500+4*REGION_TILE_SIZE_M+
      (REGION_TILE_SIZE_M*k)/64;
    const high=tileHeightAt(id,left,sharedX,z,true,seed);
    const neighbor=tileHeightAt(id,right,sharedX,z,false,seed);
    const lattice=coarseHeightAt(id,sharedX,z,seed);
    assert.ok(Math.abs(high-neighbor)<1e-8);
    assert.ok(Math.abs(high-lattice)<1e-8);
  }
  const low=makeRegionTile(id,left,false);
  const high=makeRegionTile(id,left,true);
  const neighborMesh=makeRegionTile(id,right,false);
  // Every fine-boundary vertex shares the same analytical world-space
  // normal as the adjacent coarse tile, avoiding faint panel seams.
  for(let j=0;j<=REGION_FINE_SEGMENTS;j+=4){
    const i=j*(REGION_FINE_SEGMENTS+1)+REGION_FINE_SEGMENTS;
    const k=(j/4)*(16+1);
    const nA=high.getAttribute('normal'),nB=neighborMesh.getAttribute('normal');
    for(const axis of ['getX','getY','getZ'])
      assert.ok(Math.abs(nA[axis](i)-nB[axis](k))<.03,
        'high and coarse tile shared normals should not visibly split');
  }
  assert.equal(low.getAttribute('position').count,289);
  assert.equal(high.getAttribute('position').count,(REGION_FINE_SEGMENTS+1)**2);
  assert.equal(high.getAttribute('color').count,
    high.getAttribute('position').count);
  assert.ok(high.getAttribute('position').array.every(Number.isFinite));
  assert.ok(high.getAttribute('normal').array.every(Number.isFinite));
  assert.equal(REGION_COARSE_STEP_M,125/16);
  assert.equal(REGION_TILES_PER_SIDE,8);
  const sampleX=-500+left.col*125+62.5;
  const sampleZ=-500+left.row*125+62.5;
  const delta=Math.abs(tileHeightAt(id,left,sampleX,sampleZ,true,seed)-
    tileHeightAt(id,left,sampleX,sampleZ,false,seed));
  assert.ok(delta>.001,'local detail patch must add real meter-scale relief');
  low.dispose();high.dispose();neighborMesh.dispose();
});
test('region loader creates exactly 64 tiles, swaps one patch and can dispose',()=>{
  const scene=new THREE.Scene();
  const field=new RegionalTerrainField(scene,'cutwoods');
  assert.equal(field.group.children.length,64);
  const first=field.group.children[0];
  const before=first.geometry.getAttribute('position').count;
  assert.equal(before,289);
  field.setDetailFocus(-460,-460,true);
  assert.equal(first.geometry.getAttribute('position').count,4225);
  field.setDetailFocus(0,0,false);
  assert.equal(first.geometry.getAttribute('position').count,before);
  field.dispose(scene);
  assert.equal(field.group.children.length,0);
  assert.ok(!scene.children.includes(field.group));
});
test('the existing 10m lab remains the primary intact old simulation entrypoint',()=>{
  const main=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  const lab=readFileSync(new URL('../verdigris.html',import.meta.url),'utf8');
  const world=readFileSync(new URL('../world.html',import.meta.url),'utf8');
  const worldMain=readFileSync(new URL('../src/world-main.ts',import.meta.url),'utf8');
  const vite=readFileSync(new URL('../vite.config.ts',import.meta.url),'utf8');
  const inspector=readFileSync(new URL('../src/region-inspector.ts',import.meta.url),'utf8');
  assert.ok(main.includes('new ValleyRiverField(scene)'));
  assert.ok(main.includes('new VegetationField(scene)'));
  assert.ok(main.includes('new TerrainWater(undefined, savedVolumes)'));
  assert.ok(lab.includes('id="timeScrub"'));
  assert.ok(world.includes('id="worldCanvas"'));
  assert.ok(world.includes('ENVIRONMENT LAB / 10 M'));
  assert.ok(worldMain.includes("load('cutwoods')"));
  assert.ok(worldMain.includes("zoom>=4.2"));
  assert.ok(vite.includes("world: 'world.html'"));
  assert.ok(inspector.includes('href="./world.html"'));
  assert.ok(!worldMain.includes('new TerrainWater('));
  assert.ok(!worldMain.includes('new VegetationField('));
});
