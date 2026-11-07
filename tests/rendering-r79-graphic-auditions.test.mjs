import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyStudioGraphicLighting,restoreStudioGraphicLighting,
 disposeStudioGraphicLighting,updateStudioCelRamp,studioArtRole}
 from '../src/operator-studio-graphic-lighting.ts';
import {DEFAULT_STUDIO_LIGHT_LAB,studioLightLabFromQuery,
 effectiveStudioLightLab} from '../src/operator-studio-light-lab.ts';
import {createOperatorPoseCavity}
 from '../src/operator-pose-cavity-lighting.ts';
const look=(options={})=>({...DEFAULT_STUDIO_LIGHT_LAB,...options});
const shader=()=>({
 vertexShader:'#include <begin_vertex>',
 fragmentShader:'#include <color_fragment>\n'+
  'vec3 outgoingLight=vec3(.5);\n#include <opaque_fragment>',
 uniforms:{}
});
test('R7.9 editable cutoffs change one shared 128-step ramp, not GPU programs',()=>{
 const texture=updateStudioCelRamp(3,'graphic',.53,.75);
 assert.equal(texture.image.width,128);
 assert.equal(texture.magFilter,THREE.NearestFilter);
 assert.equal(texture.colorSpace,THREE.NoColorSpace);
 const data=Array.from(texture.image.data);
 const again=updateStudioCelRamp(3,'graphic',.64,.88);
 assert.equal(texture,again);
 assert.notDeepEqual(Array.from(again.image.data),data);
 assert.equal(updateStudioCelRamp(3,'graphic',.64,.88),texture);
 for(const pair of [[2,'hard'],[2,'soft'],[3,'graphic'],[3,'classic']])
  assert.ok(updateStudioCelRamp(pair[0],pair[1],.62,.85));
});
test('R7.9 all-surfaces cel/rim includes an assembled firearm, not just clothing',()=>{
 const root=new THREE.Group(),fabric=new THREE.MeshStandardMaterial({color:0x767c65});
 const gun=new THREE.MeshStandardMaterial({color:0x343a3d,roughness:.5});
 const skin=new THREE.MeshStandardMaterial({color:0xc49e81});
 const cloth=new THREE.Mesh(new THREE.BoxGeometry(),fabric);
 const weapon=new THREE.Group();
 weapon.userData.fieldworkWeaponPresentation=true;
 weapon.userData.fieldworkRimRegion='hard-shell';
 const body=new THREE.Mesh(new THREE.BoxGeometry(),gun);
 weapon.add(body);
 const face=new THREE.Mesh(new THREE.BoxGeometry(),skin);
 const glass=new THREE.Mesh(new THREE.BoxGeometry(),
  new THREE.MeshStandardMaterial({transparent:true,opacity:.48}));
 weapon.add(glass);
 root.add(cloth,weapon,face);
 const result=applyStudioGraphicLighting(root,look({
  toon:3,rim:'dual',gradient:'violet',celProfile:'graphic',allSurfaces:true
 }));
 assert.equal(result.meshes,3);
 assert.equal(result.weapons,1);
 assert.ok(body.material instanceof THREE.MeshToonMaterial);
 assert.ok(face.material instanceof THREE.MeshToonMaterial);
 assert.ok(cloth.material instanceof THREE.MeshToonMaterial);
 assert.equal(glass.material.transparent,true,'glass remains authored');
 assert.equal(studioArtRole(body,gun),'hard');
 assert.equal(studioArtRole(cloth,fabric),'warm');
 assert.notEqual(body.material,cloth.material);
 const bodyShader=shader();
 body.material.onBeforeCompile(bodyShader,null);
 assert.match(bodyShader.fragmentShader,/fwWhite=step\(/);
 assert.match(bodyShader.fragmentShader,/fwWarm=step\(/);
 assert.match(bodyShader.fragmentShader,/fwLower=1\.0-smoothstep/);
 assert.match(bodyShader.vertexShader,/modelMatrix\*vec4\(position,1\.0\)/);
 const fabricShader=shader();
 cloth.material.onBeforeCompile(fabricShader,null);
 assert.match(fabricShader.fragmentShader,/fwWarm=step/);
 assert.doesNotMatch(fabricShader.fragmentShader,/fwWhite=step/);
 restoreStudioGraphicLighting(root);
 assert.equal(body.material,gun);
 assert.equal(cloth.material,fabric);
 assert.equal(face.material,skin);
 disposeStudioGraphicLighting(root);
});
test('R7.9 compatible pose cavity remains active inside broad toon shading',()=>{
 const root=new THREE.Group(),fabric=new THREE.MeshStandardMaterial({
  color:0x777766,vertexColors:true
 });
 const legsMaterial=fabric.clone(),chest=new THREE.Mesh(new THREE.BoxGeometry(),fabric);
 const legs=[new THREE.Mesh(new THREE.BoxGeometry(),legsMaterial),
  new THREE.Mesh(new THREE.BoxGeometry(),legsMaterial)];
 root.add(chest,...legs);
 const cavity=createOperatorPoseCavity(chest,legs,fabric,legsMaterial);
 cavity.torso.value.set(.23,.88);
 applyStudioGraphicLighting(root,look({toon:2,rim:'dual'}));
 const composed=shader();chest.material.onBeforeCompile(composed,null);
 assert.equal(composed.uniforms.fieldworkCavity.value,cavity.torso.value);
 assert.match(composed.fragmentShader,/diffuseColor\.rgb\*=1\.0-clamp\(cavity/);
 disposeStudioGraphicLighting(root);
 assert.equal(chest.material,cavity.torso.material);
});
test('R7.9 smooth dual rim works independently of cel and restores cleanly',()=>{
 const root=new THREE.Group();
 const mat=new THREE.MeshStandardMaterial({color:0x6a695f});
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(),mat);root.add(mesh);
 const setting=look({toon:0,rim:'dual',gradient:'violet-noir'});
 const result=applyStudioGraphicLighting(root,setting);
 assert.equal(result.meshes,1);
 assert.ok(mesh.material instanceof THREE.MeshStandardMaterial);
 assert.notEqual(mesh.material,mat);
 const art=shader();mesh.material.onBeforeCompile(art,null);
 assert.match(art.fragmentShader,/fwWarm=step/);
 assert.match(art.fragmentShader,/vec3\(\.36,\.33,\.78\)/);
 assert.equal(applyStudioGraphicLighting(root,look()).meshes,0);
 assert.equal(mesh.material,mat);
 disposeStudioGraphicLighting(root);
});
test('R7.9 preserves legacy URL flags and the real Compare Original state',()=>{
 const q=studioLightLabFromQuery('?operatorLightingToon=3&operatorRim=dual'+
  '&operatorCelProfile=graphic&operatorCelLow=0.52&operatorCelHigh=0.78'+
  '&operatorGradient=violet-noir&operatorShadowColor=plum-plus');
 assert.equal(q.toon,3);
 assert.equal(q.rim,'dual');
 assert.equal(q.celProfile,'graphic');
 assert.equal(q.celLow,.52);
 assert.equal(q.celHigh,.78);
 assert.equal(q.allSurfaces,true);
 assert.equal(q.gradient,'violet-noir');
 assert.equal(q.shadow,'plum-plus');
 assert.deepEqual(effectiveStudioLightLab(q,true),DEFAULT_STUDIO_LIGHT_LAB);
 assert.equal(effectiveStudioLightLab({...q,toon:0}).rim,'dual',
  'strong graphic rim can be auditioned on smooth materials');
});
