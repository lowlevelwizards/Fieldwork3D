import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as THREE from 'three';
import {ARSENAL_INSPECTION_BACKGROUND,ARSENAL_SKY_FILL,addArsenalInspectionLighting}
 from '../src/arsenal/inspection-lighting.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Arsenal owns an independent dark scene and two-sided readable light rig',()=>{
 const scene=new THREE.Scene();
 addArsenalInspectionLighting(scene);
 assert.equal(scene.background.getHex(),ARSENAL_INSPECTION_BACKGROUND);
 assert.equal(ARSENAL_INSPECTION_BACKGROUND,0x182824);
 const directional=scene.children.filter(x=>x instanceof THREE.DirectionalLight);
 assert.equal(directional.length,2);
 assert.equal(directional[0].intensity,2.35);
 assert.equal(directional[1].intensity,ARSENAL_SKY_FILL.fillIntensity);
 const hemi=scene.children.find(x=>x instanceof THREE.HemisphereLight);
 assert.equal(hemi?.intensity,ARSENAL_SKY_FILL.hemisphereIntensity);
 assert.equal(hemi?.color.getHex(),ARSENAL_SKY_FILL.sky);
 assert.equal(hemi?.groundColor.getHex(),ARSENAL_SKY_FILL.ground);
 assert.equal(directional[1].color.getHex(),ARSENAL_SKY_FILL.fill);
 assert.ok(directional[1].position.z>0,'broad side bounce illuminates side-on ARs');
 assert.ok(ARSENAL_SKY_FILL.hemisphereIntensity>=2,'dark furniture must remain legible');
 assert.ok(ARSENAL_SKY_FILL.fillIntensity>=1.5,'do not crush gallery faces');
 assert.ok(directional[1].intensity<directional[0].intensity,'key remains dominant');
 assert.match(read('src/arsenal/thumbnailer.ts'),/addArsenalInspectionLighting\(this\.scene\)/);
 assert.match(read('src/arsenal/viewport.ts'),/addArsenalInspectionLighting\(this\.scene\)/);
 assert.match(read('src/arsenal/thumbnailer.ts'),/configureGraphicRendererOutput\(this\.renderer\)/);
});
test('Arsenal uses projected white accessible part markers without selection box',()=>{
 const viewer=read('src/arsenal/viewport.ts');
 const styles=read('src/arsenal/arsenal.css');
 const screen=read('src/arsenal/workbench-screen.ts');
 assert.doesNotMatch(viewer,/Box3Helper|this\.highlight/);
 assert.match(viewer,/workbenchVisualAnchors\(this\.config,this\.body,'attachments'\)/);
 assert.match(viewer,/partVisualBounds\(this\.body,slot as FamilyPartSlot\)/);
 assert.match(viewer,/positionSocketDots\(w,h\)/);
 assert.match(viewer,/this\.socketLayer\.classList\.add\('is-inspecting'\)/);
 assert.match(viewer,/this\.socketLayer\.classList\.remove\('is-inspecting'\)/);
 assert.match(viewer,/setTimeout\(/);
 assert.match(viewer,/button\.setAttribute\('aria-label','Select '/);
 assert.match(screen,/viewer\.setVisibleSlots\(activeCategory\.slots\)/);
 assert.match(styles,/\.arsenal-wb-socket\[aria-pressed="true"\]/);
 assert.match(styles,/\.arsenal-wb-socket\[hidden\]\{display:none\}/);
 assert.match(styles,/\.arsenal-wb-sockets\.is-inspecting/);
 assert.match(styles,/width:44px;height:44px/);
});
test('Arsenal experimental light lab and offsite link are fully removed',()=>{
 const screen=read('src/arsenal/workbench-screen.ts');
 const html=read('operator-studio.html');
 const viewer=read('src/arsenal/viewport.ts');
 assert.doesNotMatch(screen,/mountArsenalLightingLab|lightingLab/);
 assert.doesNotMatch(viewer,/applyStudioGraphicLighting|STUDIO_INSPECTION_BACKGROUND|setLighting\(/);
 assert.doesNotMatch(html,/OPEN 3D ARSENAL LIGHTING LAB/);
 assert.ok(!existsSync(new URL('../src/arsenal/lighting-lab.ts',import.meta.url)));
});
