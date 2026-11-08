import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {APPROVED_GRAPHIC_LIGHTING,DEFAULT_STUDIO_LIGHT_LAB,
 effectiveStudioLightLab,studioLightLabFromQuery}
 from '../src/operator-studio-light-lab.ts';
import {applyStudioGraphicLighting,disposeStudioGraphicLighting,
 updateStudioCelRamp}
 from '../src/operator-studio-graphic-lighting.ts';
import {enableWorldGraphicMaterial,applyWorldGraphicLighting}
 from '../src/breach-graphic-world-lighting.ts';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('R7.18 approved material is exactly three-band, plum and rose',()=>{
 assert.equal(APPROVED_GRAPHIC_LIGHTING.toon,3);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.gradient,'piece-rose');
 assert.equal(APPROVED_GRAPHIC_LIGHTING.shadow,'plum-plus');
 assert.equal(APPROVED_GRAPHIC_LIGHTING.rim,'dual');
 assert.equal(APPROVED_GRAPHIC_LIGHTING.rimFabricOpacity,0);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.rimSkinOpacity,0);
 assert.deepEqual(studioLightLabFromQuery(''),APPROVED_GRAPHIC_LIGHTING);
 assert.deepEqual(effectiveStudioLightLab(APPROVED_GRAPHIC_LIGHTING,true),
  DEFAULT_STUDIO_LIGHT_LAB);
 assert.equal(effectiveStudioLightLab({...APPROVED_GRAPHIC_LIGHTING,
  rimFabricOpacity:1,rimSkinOpacity:1}).rimSkinOpacity,0);
});
test('R7.18 three distinct cel tones use nearest filtering',()=>{
 const ramp=updateStudioCelRamp(3,'graphic',.60,.86);
 const data=ramp.image.data;
 const sample=q=>data[Math.floor(q*128)*4];
 assert.equal(ramp.magFilter,THREE.NearestFilter);
 assert.ok(sample(.30)<sample(.72));
 assert.ok(sample(.72)<sample(.97));
});
test('R7.18 architectural shader patches existing standard material once',()=>{
 const root=new THREE.Group();
 const surface=new THREE.MeshStandardMaterial({color:0x85755d});
 const basic=new THREE.MeshBasicMaterial({color:0xffffff});
 const o=new THREE.Mesh(new THREE.BoxGeometry(),surface);
 const p=new THREE.Mesh(new THREE.PlaneGeometry(),basic);
 root.add(o,p);
 const first=applyWorldGraphicLighting(root);
 assert.equal(first.materials,1);
 assert.equal(first.meshes,2);
 assert.equal(applyWorldGraphicLighting(root).materials,0);
 assert.equal(o.material,surface);
 assert.equal(p.material,basic);
 const shader={vertexShader:'#include <begin_vertex>',
  fragmentShader:'#include <lights_fragment_end>'};
 surface.onBeforeCompile(shader,null);
 assert.match(shader.vertexShader,/vFWGraphicHeight/);
 assert.match(shader.fragmentShader,/fwWorldBand/);
 assert.match(shader.fragmentShader,/fwWorldRose/);
 assert.match(shader.fragmentShader,/fwWorldFace<.60/);
 assert.match(shader.fragmentShader,/fwWorldFace<.86/);
 assert.equal(surface.transparent,false);
 const glass=new THREE.MeshStandardMaterial({transparent:true});
 assert.equal(enableWorldGraphicMaterial(glass),false);
});
test('R7.18 soft gear and skin never receive glowing rim uniforms',()=>{
 const root=new THREE.Group(),fabric=new THREE.MeshStandardMaterial(),
  skin=new THREE.MeshStandardMaterial(),metal=new THREE.MeshStandardMaterial({metalness:.7});
 fabric.userData.fieldworkFabric=true;
 skin.userData.fieldworkStudioSkin=true;
 const meshes=[fabric,skin,metal].map(m=>new THREE.Mesh(
  new THREE.BoxGeometry(2,2,2),m));
 root.add(...meshes);
 applyStudioGraphicLighting(root,APPROVED_GRAPHIC_LIGHTING);
 assert.equal(meshes[0].children.length,0);
 assert.equal(meshes[1].children.length,0);
 assert.equal(meshes[2].children.length,0);
 const shader=()=>({vertexShader:'#include <begin_vertex>',
  fragmentShader:'#include <opaque_fragment>',uniforms:{}});
 const head=shader(),shirt=shader(),shell=shader();
 meshes[0].material.onBeforeCompile(shirt,null);
 meshes[1].material.onBeforeCompile(head,null);
 meshes[2].material.onBeforeCompile(shell,null);
 assert.equal(shirt.uniforms.fieldworkRimStrength,undefined);
 assert.equal(head.uniforms.fieldworkRimStrength,undefined);
 assert.ok(shell.uniforms.fieldworkRimStrength);
 assert.match(shirt.fragmentShader,/fieldworkCelHighlightTone/);
 disposeStudioGraphicLighting(root);
 assert.equal(meshes[0].material,fabric);
 assert.equal(meshes[1].material,skin);
});
test('R7.18 tactical render quality remains independent of Studio shadow size',()=>{
 const scene=read('src/breach-3d.ts');
 const material=read('src/operator-studio-graphic-lighting.ts');
 assert.match(scene,/shadow\.mapSize\.set\(this\.quality\.shadowSize/);
 assert.match(scene,/applyWorldGraphicLighting/);
 assert.match(scene,/graphicOperatorRestyles/);
 assert.doesNotMatch(scene,/studioShadowSize\(/);
 assert.doesNotMatch(material,/fwSoftBand|fwSkinTint/);
});
