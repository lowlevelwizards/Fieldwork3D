import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {STUDIO_INSPECTION_BACKGROUND,STUDIO_INSPECTION_LIGHT,
 STUDIO_KEY_DIRECTION,studioShadowMode,studioShadowSize,
 fitStudioKeyShadow} from '../src/operator-studio-lighting.ts';
import {THUMB_LINEAR_TO_SRGB} from '../src/operator-thumbnail-color.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('R7 inspection lighting has one neutral background and coherent key profile',()=>{
 assert.equal(STUDIO_INSPECTION_BACKGROUND,0xc4c7bd);
 assert.equal(STUDIO_INSPECTION_LIGHT.keyIntensity,2.35);
 assert.equal(STUDIO_INSPECTION_LIGHT.hemiIntensity,1.20);
 assert.equal(studioShadowMode(''),'hybrid');
 assert.equal(studioShadowMode('?operatorLighting=legacy'),'legacy');
 assert.equal(studioShadowSize('?operatorShadowSize=512'),512);
 assert.ok(Math.abs(STUDIO_KEY_DIRECTION.length()-1)<1e-8);
 const root=new THREE.Group();
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(5,10,5),
  new THREE.MeshStandardMaterial());
 mesh.castShadow=true;root.add(mesh);
 const light=new THREE.DirectionalLight();
 assert.equal(fitStudioKeyShadow(light,root),true);
 assert.ok(light.shadow.camera.right>light.shadow.camera.left);
 assert.ok(light.shadow.camera.far>light.shadow.camera.near);
 mesh.geometry.dispose();mesh.material.dispose();
});

test('R7 appearance thumbnails inherit Studio key/fill, shadow and backdrop',()=>{
 const grid=source('src/operator-appearance-grid.ts');
 const studio=source('src/operator-studio.ts');
 assert.match(grid,/new OperatorStudioLighting\(this\.scene,this\.renderer,/);
 assert.match(grid,/this\.lighting\.beforeRender\(rig\.root\)/);
 assert.match(grid,/this\.renderer\.setClearColor\(STUDIO_INSPECTION_BACKGROUND,1\)/);
 assert.match(studio,/renderer\.setClearColor\(STUDIO_INSPECTION_BACKGROUND\)/);
 assert.doesNotMatch(grid,/0x23352e|0x435448/);
 assert.match(grid,/image\.data\[dst\]=THUMB_LINEAR_TO_SRGB/);
 assert.doesNotMatch(grid,/if\(item\.slot==='facewear'\)\{/);
 assert.equal(THUMB_LINEAR_TO_SRGB[0],0);
 assert.equal(THUMB_LINEAR_TO_SRGB[255],255);
 assert.ok(THUMB_LINEAR_TO_SRGB[64]>64);
});

test('R7 hidden Studio suspends optional GPU work without stopping simulation',()=>{
 const main=source('src/breach-main.ts');
 const studio=source('src/operator-studio.ts');
 const grid=source('src/operator-appearance-grid.ts');
 assert.match(main,/STUDIO_WARM_RETAIN_MS=60_000/);
 assert.match(main,/studioFrame\.src='about:blank'/);
 assert.match(main,/studioOccludesTactical/);
 assert.match(main,/if\(!studioOccludesTactical&&stage/);
 assert.match(main,/if\(!studioOccludesTactical\)render\(\)/);
 assert.match(studio,/studioSuspended=true/);
 assert.match(studio,/thumbBrowser\.setSuspended\(true\)/);
 assert.match(grid,/if\(this\.suspended\)return/);
 assert.match(studio,/canvas\.dataset\.ready=rig\?\.root\.visible\?'true':'false'/);
});
