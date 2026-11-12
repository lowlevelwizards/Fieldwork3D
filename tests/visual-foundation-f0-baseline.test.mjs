import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APPROVED_GRAPHIC_LIGHTING} from '../src/operator-studio-light-lab.ts';
import {STUDIO_KEY_DIRECTION,STUDIO_INSPECTION_LIGHT} from '../src/operator-studio-lighting.ts';
import {WORLD_GRAPHIC_FRAGMENT} from '../src/breach-graphic-world-lighting.ts';
import {materialProfile} from '../src/rendering/pixel-profiles.ts';
import {lightingPresentation} from '../src/equipment-lighting-presentation.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('F0 records the approved graphic baseline without changing authored kits',()=>{
 assert.equal(APPROVED_GRAPHIC_LIGHTING.toon,3);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.celProfile,'graphic');
 assert.equal(APPROVED_GRAPHIC_LIGHTING.rimFabricOpacity,0);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.rimSkinOpacity,0);
 assert.ok(APPROVED_GRAPHIC_LIGHTING.celHigh>APPROVED_GRAPHIC_LIGHTING.celLow);
 assert.ok(Math.abs(STUDIO_KEY_DIRECTION.length()-1)<1e-8);
 assert.ok(STUDIO_INSPECTION_LIGHT.keyIntensity>0);
});

test('F0 maintains separate opaque world and specialized operator rendering',()=>{
 assert.match(WORLD_GRAPHIC_FRAGMENT,/reflectedLight\.(directDiffuse|indirectDiffuse)/);
 assert.match(source('src/breach-graphic-world-lighting.ts'),/material\.transparent/);
 assert.match(source('src/operator-studio-graphic-lighting.ts'),/restoreStudioGraphicLighting/);
 assert.match(source('src/breach-3d.ts'),/get\('lighting'\)!=='legacy'/);
});

test('F0 semantic materials and mission conditions are authoritative',()=>{
 assert.equal(materialProfile('furniture-wood').structure,'directional');
 assert.equal(materialProfile('fabric').family,'textile');
 assert.equal(materialProfile('industrial-steel').family,'manufactured');
 for(const mode of ['day','evening','night','blackout','emergency']){
  const lighting=lightingPresentation(mode);
  assert.ok(lighting.hemisphere>=0);
  assert.ok(lighting.sun>=0);
 }
 assert.ok(lightingPresentation('day').sun>lightingPresentation('blackout').sun);
 assert.match(source('src/worldgen/building-palettes.ts'),/Same archetype, varied seeds/);
});
