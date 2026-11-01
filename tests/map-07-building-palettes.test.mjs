import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingTheme,roomFloor} from '../src/worldgen/building-palettes.ts';
import {BUILDING_ARCHETYPES} from '../src/breach-archetypes.ts';
test('MAP 07 assigns three stable real palettes to all archetypes',()=>{
 for(const kind of BUILDING_ARCHETYPES){
  const variants=[0,1,2].map(seed=>buildingTheme(kind,seed));
  assert.equal(new Set(variants.map(x=>x.name)).size,3,kind);
  for(const theme of variants){
   assert.ok([theme.wall,theme.floor,theme.door,theme.trim,theme.cap,
     theme.tile,theme.wood,theme.hall,theme.grout].every(c=>c>=0&&c<=0xffffff));
  }
  assert.deepEqual(buildingTheme(kind,12),buildingTheme(kind,12));
 });
});
test('MAP 07 differentiates wet room floor from living room',()=>{
 const theme=buildingTheme('house',42);
 assert.notEqual(roomFloor(theme,'bathroom'),roomFloor(theme,'living'));
});
