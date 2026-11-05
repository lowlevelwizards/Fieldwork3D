import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {HEADWEAR_CAMO_IDS,HEADWEAR_CAMO_RECIPES,
 headwearCamoIndices,headwearCamoCoverage,headwearCamoPixels,
 headwearCamoPlacement} from '../src/operator-headwear-camo.ts';
import {FABRIC_CAMO_DENSITY,wardrobeFabricCamoTexture}
 from '../src/operator-fabric-camo-materials.ts';

const JGSDF_8F_RGBA_SHA='05c026d4979bd4941a94e9f3415d16ca59e9fd706c42dbdb828ac0071d8871e7';
const S2000_8E_RGBA_SHA='4cd092f87a82a262c5ed78d5436f5e5725ab0a0cac8dc832adebd1f991505bb9';
const digest=id=>createHash('sha256').update(headwearCamoPixels(id)).digest('hex');
function stats(tile){
 let edgeCount=0,maxCrop=0,over80=0;
 for(let y=0;y<64;y++)for(let x=0;x<64;x++){
  const here=tile[y*64+x];
  if(here!==tile[y*64+((x+1)&63)])edgeCount++;
  if(here!==tile[((y+1)&63)*64+x])edgeCount++;
  const counts=[0,0,0];
  for(let dy=0;dy<18;dy++)for(let dx=0;dx<12;dx++)
   counts[tile[((y+dy)&63)*64+((x+dx)&63)]]++;
  const dominant=Math.max(...counts)/216;
  maxCrop=Math.max(maxCrop,dominant);
  if(dominant>.8)over80++;
 }
 return {edgeCount,maxCrop,over80:over80/4096};
}
test('8H preserves approved M98 composition, removes sharp micro-hooks only',()=>{
 const id='norwegian-m98';
 const tile=headwearCamoIndices(id),cov=headwearCamoCoverage(id);
 assert.equal(tile.length,4096);
 assert.deepEqual([...new Set(tile)].sort(),[0,1,2]);
 assert.equal(HEADWEAR_CAMO_RECIPES[id].colors.length,3);
 for(const share of cov)assert.ok(share>.27&&share<.4);
 const {edgeCount,maxCrop,over80}=stats(tile);
 console.log('8H M98 final stats',JSON.stringify({edgeCount,maxCrop,over80,coverage:cov}));
 assert.ok(edgeCount>=1220&&edgeCount<=1260,
  '8H trims minor hooks from the 8G 1289-edge tile, not a full redraw');
 assert.ok(maxCrop<.86,'worst 12x18 fabric crop stays clearly mixed');
 assert.ok(over80<.015,'rare single-color dominated cut phases');
 assert.equal(FABRIC_CAMO_DENSITY[id],3.0,'retain approved 8G scale');
 assert.deepEqual(headwearCamoIndices(id),tile,'cached master is deterministic');
});
test('8H leaves JGSDF and Soldier 2000 bit-for-bit unchanged',()=>{
 assert.equal(digest('jgsdf-type2'),JGSDF_8F_RGBA_SHA);
 assert.equal(digest('south-african-s2000'),S2000_8E_RGBA_SHA);
});
test('8H preserves 54 catalog entries and textile phases',()=>{
 assert.equal(HEADWEAR_CAMO_IDS.length,54);
 for(const seed of [0,5,17,73,401]){
  const id='norwegian-m98';
  const cut=headwearCamoPlacement('rook','trousers',id,seed);
  const texture=wardrobeFabricCamoTexture(id,'trousers',cut);
  assert.deepEqual(texture.image.data,headwearCamoPixels(id));
  assert.equal(texture.repeat.x,32*FABRIC_CAMO_DENSITY[id]/64);
  assert.equal(texture.repeat.y,texture.repeat.x);
 }
});
