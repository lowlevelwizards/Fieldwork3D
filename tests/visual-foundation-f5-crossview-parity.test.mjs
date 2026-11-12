import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GRAPHIC_RENDER_OUTPUT,GRAPHIC_LIGHT_PROFILE,
 configureGraphicRendererOutput} from '../src/rendering/graphic-lighting-profile.ts';
import {APPROVED_GRAPHIC_LIGHTING} from '../src/operator-studio-light-lab.ts';
import {STUDIO_KEY_DIRECTION,STUDIO_INSPECTION_BACKGROUND}
 from '../src/operator-studio-lighting.ts';
import {MATERIAL_RESPONSES} from '../src/rendering/material-identity.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('F5.3 tactical, Studio and Arsenal share one renderer output contract',()=>{
 for(const p of ['src/breach-3d.ts','src/operator-studio.ts','src/arsenal/viewport.ts'])
  assert.match(source(p),/configureGraphicRendererOutput\(/,p);
 const r={outputColorSpace:null,toneMapping:0,toneMappingExposure:0};
 configureGraphicRendererOutput(r);
 assert.equal(r.outputColorSpace,THREE.SRGBColorSpace);
 assert.equal(r.toneMapping,THREE.ACESFilmicToneMapping);
 assert.equal(r.toneMappingExposure,GRAPHIC_RENDER_OUTPUT.exposure);
 assert.match(source('src/operator-appearance-grid.ts'),/this\.renderer=renderer/);
});
test('F5.3 material family and graphic ramp are coherent in every view',()=>{
 assert.equal(APPROVED_GRAPHIC_LIGHTING.celLow,GRAPHIC_LIGHT_PROFILE.lowCutoff);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.celHigh,GRAPHIC_LIGHT_PROFILE.highCutoff);
 assert.ok(new THREE.Vector3(...GRAPHIC_LIGHT_PROFILE.keyDirection).normalize()
  .distanceTo(STUDIO_KEY_DIRECTION)<1e-9);
 assert.ok(MATERIAL_RESPONSES.steel.highlight>MATERIAL_RESPONSES.fabric.highlight);
 assert.ok(MATERIAL_RESPONSES.fabric.shadow>=MATERIAL_RESPONSES.armor.shadow);
 assert.equal(STUDIO_INSPECTION_BACKGROUND,0xc4c7bd);
 assert.match(source('src/arsenal/viewport.ts'),/this\.scene\.background=new THREE\.Color\(STUDIO_INSPECTION_BACKGROUND\)/);
});
test('F5.3 changes preserve original legacy options and visibility ownership',()=>{
 const scene=source('src/breach-3d.ts');
 assert.match(scene,/get\('lighting'\)!=='legacy'/);
 assert.match(scene,/this\.scene\.fog=null/);
 assert.match(source('src/operator-studio-graphic-lighting.ts'),/restoreStudioGraphicLighting/);
 assert.match(source('src/rendering/breach-site-scene-builder.ts'),/intelSurfaces/);
});
