import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_ARCHETYPES} from '../src/breach-archetypes.ts';
import {buildingTheme,paletteLuminance,ARCHITECTURAL_COLOR_RELATIONSHIPS as C}
 from '../src/worldgen/building-palettes.ts';
const contrast=(a,b)=>Math.abs(paletteLuminance(a)-paletteLuminance(b));

test('F4.1 all 33 established schemes retain readable wall/floor/trim/cap contrast',()=>{
 for(const kind of BUILDING_ARCHETYPES)for(const seed of [0,1,2]){
  const t=buildingTheme(kind,seed);
  assert.ok(contrast(t.wall,t.floor)>=C.minimumFloorWall-1,kind+':'+seed+':floor');
  assert.ok(contrast(t.wall,t.tile)>=C.minimumTileWall-1,kind+':'+seed+':tile');
  assert.ok(contrast(t.wall,t.trim)>=C.minimumTrimWall-1,kind+':'+seed+':trim');
  assert.ok(contrast(t.wall,t.cap)>=C.minimumCapWall-1,kind+':cap');
  assert.equal(buildingTheme(kind,seed).name,t.name);
 }
});
test('F4.1 archetype palettes stay distinct and seeded, including light clinics',()=>{
 for(const kind of BUILDING_ARCHETYPES){
  const themes=[0,1,2].map(seed=>buildingTheme(kind,seed));
  assert.equal(new Set(themes.map(t=>t.name)).size,3,kind);
  assert.ok(themes.every(t=>t.wall>=0&&t.wall<=0xffffff));
 }
 const clinic=buildingTheme('clinic',1);
 assert.ok(paletteLuminance(clinic.floor)>160,'clinical floor stays light');
 assert.ok(paletteLuminance(clinic.tile)>160,'clinical tile stays light');
 assert.ok(contrast(clinic.wall,clinic.floor)>=C.minimumFloorWall-1);
 assert.equal(buildingTheme('motel',7).name,buildingTheme('motel',7).name);
});
