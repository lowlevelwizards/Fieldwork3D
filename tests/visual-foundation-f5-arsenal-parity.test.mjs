import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';
import * as finishes from '../src/weapons/geometry/weapon-visual-palette.ts';
const source=readFileSync(new URL('../src/arsenal/viewport.ts',import.meta.url),'utf8');

test('Arsenal uses a neutral light matte and matching gallery lighting',()=>{
 const lights=readFileSync(new URL('../src/arsenal/inspection-lighting.ts',import.meta.url),'utf8');
 const thumbnail=readFileSync(new URL('../src/arsenal/thumbnailer.ts',import.meta.url),'utf8');
 assert.match(lights,/ARSENAL_INSPECTION_BACKGROUND=0xa1aaa0/);
 assert.match(lights,/HemisphereLight/);
 assert.match(lights,/DirectionalLight/);
 assert.match(source,/addArsenalInspectionLighting\(this\.scene\)/);
 assert.match(thumbnail,/addArsenalInspectionLighting\(this\.scene\)/);
 assert.doesNotMatch(source,/STUDIO_INSPECTION_BACKGROUND|studioShadowPalette|Box3Helper/);
 assert.doesNotMatch(source,/applyStudioGraphicLighting|setLighting\(/);
 assert.match(source,/tagVisualMaterial\(new THREE\.MeshStandardMaterial/);
});
test('F5.1 original weapon palette and approved materials are unmodified',()=>{
 assert.equal(visualMaterialRole(finishes.AK_WOOD_AMBER),'wood');
 assert.equal(visualMaterialRole(finishes.HK_DARK_POLYMER),'polymer');
 assert.equal(finishes.AR_BLACK_METAL.color.getHex(),0x414a44);
 assert.equal(THREE.SRGBColorSpace,'srgb');
});
