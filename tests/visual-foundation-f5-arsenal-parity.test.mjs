import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';
import * as finishes from '../src/weapons/geometry/weapon-visual-palette.ts';
const source=readFileSync(new URL('../src/arsenal/viewport.ts',import.meta.url),'utf8');

test('F5.1 Arsenal original/A-B comparison keeps the same light/background',()=>{
 assert.match(source,/const plum=studioShadowPalette\(this\.lighting\.shadow\)/);
 assert.match(source,/this\.scene\.background=new THREE\.Color\(STUDIO_INSPECTION_BACKGROUND\)/);
 assert.match(source,/applyStudioGraphicLighting\(this\.model,settings\)/);
 assert.doesNotMatch(source,/this\.scene\.background=new THREE\.Color\(0x162723\)/);
 assert.match(source,/tagVisualMaterial\(new THREE\.MeshStandardMaterial/);
});
test('F5.1 original weapon palette and approved materials are unmodified',()=>{
 assert.equal(visualMaterialRole(finishes.AK_WOOD_AMBER),'wood');
 assert.equal(visualMaterialRole(finishes.HK_DARK_POLYMER),'polymer');
 assert.equal(finishes.AR_BLACK_METAL.color.getHex(),0x414a44);
 assert.equal(THREE.SRGBColorSpace,'srgb');
});
