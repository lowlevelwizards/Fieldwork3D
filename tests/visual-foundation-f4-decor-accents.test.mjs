import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingTheme,roomAccessoryColor,paletteLuminance}
 from '../src/worldgen/building-palettes.ts';
import {readFileSync} from 'node:fs';

test('F4.3 existing rug accents are restrained and harmonized per building',()=>{
 const source=0x8a7865;
 const motel=buildingTheme('motel',0),warehouse=buildingTheme('warehouse',0);
 const lounge=roomAccessoryColor(motel,'waiting',source);
 const backroom=roomAccessoryColor(motel,'storage',source);
 assert.notEqual(lounge,backroom);
 assert.ok(Math.abs(paletteLuminance(source)-paletteLuminance(lounge))<35);
 assert.ok(Math.abs(paletteLuminance(source)-paletteLuminance(backroom))<20);
 assert.equal(roomAccessoryColor(motel,'waiting',source),lounge);
 assert.notEqual(roomAccessoryColor(warehouse,'waiting',source),lounge);
});
test('F4.3 does not introduce extra scenery or knowledge-bearing surfaces',()=>{
 const src=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
 assert.match(src,/roomAccessoryColor\(theme,purpose,baseRugColor\)/);
 assert.match(src,/host\.box\(prop,0,\.11,0,w,\.22,d,textile,false\)/);
});
