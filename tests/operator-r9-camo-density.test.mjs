import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_DENSITY,
 headwearCamoPixels,headwearCamoSize} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,fabricCamoWorldPeriod,
 wardrobeFabricCamoTexture,mapGarmentBoxUV}
 from '../src/operator-fabric-camo-materials.ts';
import {TILE_WORLD_SIZE} from '../src/rendering/pixel-materials.ts';
test('R9 all thirty patterns use finite physical textile sizes across ALL 3D channels',()=>{
 assert.equal(Object.keys(FABRIC_CAMO_DENSITY).length,38);
 for(const id of HEADWEAR_CAMO_IDS){
  const size=headwearCamoSize(id),density=FABRIC_CAMO_DENSITY[id];
  assert.ok(density>=1&&density<=3.5,id+' plausible metric textile density');
  const period=fabricCamoWorldPeriod(id);
  assert.ok(period>=10&&period<=33,id+' visible motif repeat scale');
  let reference=null;
  for(const channel of ['top','trousers','armor','gear','pack']){
   const tex=wardrobeFabricCamoTexture(id,channel,{offsetX:0,offsetY:0});
   assert.equal(tex.repeat.x,TILE_WORLD_SIZE*density/size);
   assert.equal(tex.repeat.y,tex.repeat.x);
   assert.equal(tex.magFilter,THREE.NearestFilter);
   assert.equal(tex.image.width,size);
   assert.equal(tex.image.data,headwearCamoPixels(id));
   if(reference!==null)assert.equal(tex.repeat.x,reference,id+' cross-material scale parity');
   reference=tex.repeat.x;
  }
 }
});
test('R9 blobby organic masters are denser than before without shrinking digital motifs',()=>{
 for(const id of ['m81-woodland','woodland-dpm','scorpion-w2','british-mtp']){
  assert.ok(FABRIC_CAMO_DENSITY[id]>HEADWEAR_CAMO_DENSITY[id]*1.25,id);
 }
 assert.ok(fabricCamoWorldPeriod('m81-woodland')<=23);
 assert.ok(fabricCamoWorldPeriod('woodland-dpm')<=18);
 assert.ok(fabricCamoWorldPeriod('scorpion-w2')<=22);
 assert.ok(fabricCamoWorldPeriod('british-mtp')<=23);
 for(const id of ['multicam','ucp','russian-emr','flecktarn',
  'woodland-marpat','finnish-m05'])
  assert.equal(FABRIC_CAMO_DENSITY[id],HEADWEAR_CAMO_DENSITY[id],
   'approved dense detail stays unchanged for '+id);
});
test('R9 garment box UVs still encode metric face sizes and authored offsets',()=>{
 const geo=mapGarmentBoxUV(new THREE.BoxGeometry(12,18,8),12,18,8,5,2,-3);
 const uv=geo.getAttribute('uv');
 assert.ok(uv&&uv.count===24);
 const rightSpan=Math.abs(uv.getX(1)-uv.getX(0));
 const verticalSpan=Math.abs(uv.getY(2)-uv.getY(0));
 assert.ok(Math.abs(rightSpan-8/TILE_WORLD_SIZE)<1e-5||
  Math.abs(rightSpan-12/TILE_WORLD_SIZE)<1e-5);
 assert.ok(Math.abs(verticalSpan-18/TILE_WORLD_SIZE)<1e-5);
 assert.notDeepEqual([uv.getX(0),uv.getY(0)],[uv.getX(8),uv.getY(8)],
  'different cut faces have offsets, not the same stretched sticker');
 geo.dispose();
});
