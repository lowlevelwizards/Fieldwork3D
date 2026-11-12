import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GRAPHIC_LIGHT_PROFILE as G,GRAPHIC_RENDER_OUTPUT,
 configureGraphicRendererOutput} from '../src/rendering/graphic-lighting-profile.ts';
import {STUDIO_KEY_DIRECTION} from '../src/operator-studio-lighting.ts';
import {APPROVED_GRAPHIC_LIGHTING} from '../src/operator-studio-light-lab.ts';
import {WORLD_GRAPHIC_FRAGMENT,enableWorldGraphicMaterial}
 from '../src/breach-graphic-world-lighting.ts';
import {updateStudioCelRamp} from '../src/operator-studio-graphic-lighting.ts';

test('F1 shared lighting agrees across world and Studio',()=>{
 assert.equal(G.lowCutoff,APPROVED_GRAPHIC_LIGHTING.celLow);
 assert.equal(G.highCutoff,APPROVED_GRAPHIC_LIGHTING.celHigh);
 assert.ok(Math.abs(new THREE.Vector3(...G.keyDirection).normalize()
  .distanceTo(STUDIO_KEY_DIRECTION))<1e-9);
 assert.match(WORLD_GRAPHIC_FRAGMENT,/fwidth\(fwWorldFace\)/);
 assert.match(WORLD_GRAPHIC_FRAGMENT,/fwWorldBand/);
 assert.match(WORLD_GRAPHIC_FRAGMENT,/reflectedLight\.indirectDiffuse/);
 const ramp=updateStudioCelRamp(3,'graphic',G.lowCutoff,G.highCutoff);
 assert.equal(ramp.colorSpace,THREE.NoColorSpace);
 assert.equal(ramp.magFilter,THREE.NearestFilter);
 const values=ramp.image.data;
 assert.ok(values[0]<values[Math.floor(128*.75)*4]);
 assert.ok(values[Math.floor(128*.75)*4]<values[127*4]);
});

test('F1 color output is explicit and consistent without a GPU context',()=>{
 const renderer={outputColorSpace:'',toneMapping:-1,toneMappingExposure:0};
 configureGraphicRendererOutput(renderer);
 assert.equal(renderer.outputColorSpace,THREE.SRGBColorSpace);
 assert.equal(renderer.toneMapping,THREE.ACESFilmicToneMapping);
 assert.equal(renderer.toneMappingExposure,GRAPHIC_RENDER_OUTPUT.exposure);
});

test('F1 world graphic shader preserves the opaque one-pass contract',()=>{
 const material=new THREE.MeshStandardMaterial({color:0x839183});
 assert.equal(enableWorldGraphicMaterial(material),true);
 assert.equal(enableWorldGraphicMaterial(material),false);
 const shader={vertexShader:'#include <begin_vertex>',
  fragmentShader:'#include <lights_fragment_end>'};
 material.onBeforeCompile(shader,null);
 assert.match(shader.vertexShader,/vFWGraphicHeight/);
 assert.match(shader.fragmentShader,/smoothstep/);
 assert.match(shader.fragmentShader,/fwidth\(fwWorldFace\)/);
 const transparent=new THREE.MeshStandardMaterial({transparent:true,opacity:.5});
 assert.equal(enableWorldGraphicMaterial(transparent),false);
 material.dispose();transparent.dispose();
});
