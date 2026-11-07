import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyStudioGraphicLighting,restoreStudioGraphicLighting,
 disposeStudioGraphicLighting,updateStudioCelRamp,studioArtRole,
 ensureStudioPieceGradient} from '../src/operator-studio-graphic-lighting.ts';
import {DEFAULT_STUDIO_LIGHT_LAB,studioLightLabFromQuery,
 effectiveStudioLightLab} from '../src/operator-studio-light-lab.ts';
import {createOperatorPoseCavity} from '../src/operator-pose-cavity-lighting.ts';

const look=(options={})=>({...DEFAULT_STUDIO_LIGHT_LAB,...options});
const shader=()=>({
 vertexShader:'#include <begin_vertex>',
 fragmentShader:'#include <color_fragment>\n'+
  'vec3 outgoingLight=vec3(0.5);\n#include <opaque_fragment>',
 uniforms:{}
});
test('R7.10 two-band graphic threshold edits one nearest ramp in place',()=>{
 const texture=updateStudioCelRamp(2,'graphic',.70,.84);
 assert.equal(texture.image.width,128);
 assert.equal(texture.magFilter,THREE.NearestFilter);
 const original=Array.from(texture.image.data);
 assert.equal(updateStudioCelRamp(2,'graphic',.78,.84),texture);
 assert.notDeepEqual(Array.from(texture.image.data),original);
 assert.equal(updateStudioCelRamp(2,'graphic',.78,.84),texture);
});
test('R7.10 every independent piece—including pouches and weapons—gets its own full height',()=>{
 const rig=new THREE.Group();
 const uniform=new THREE.MeshStandardMaterial({color:0xb59a71});
 const pouch=new THREE.Mesh(new THREE.BoxGeometry(2,3,2),uniform);
 const plate=new THREE.Mesh(new THREE.BoxGeometry(8,7,3),uniform);
 plate.position.set(0,35,0);pouch.position.set(3,28,2);
 const weapon=new THREE.Group();
 weapon.userData.fieldworkWeaponPresentation=true;
 weapon.userData.fieldworkRimRegion='hard-shell';
 const barrel=new THREE.Mesh(new THREE.BoxGeometry(12,1.5,1.5),
  new THREE.MeshStandardMaterial({color:0x303339}));
 barrel.position.set(13,32,0);weapon.add(barrel);
 rig.add(pouch,plate,weapon);
 const result=applyStudioGraphicLighting(rig,
  look({toon:2,rim:'dual',gradient:'piece',shadow:'plum-plus'}));
 assert.equal(result.meshes,3);
 assert.equal(result.weapons,1);
 for(const node of [pouch,plate,barrel]){
  const attr=node.geometry.getAttribute('fieldworkPieceHeight');
  assert.ok(attr,'per-piece height attribute on '+node.uuid);
  assert.ok(attr.count>0);
  assert.equal(Math.min(...Array.from(attr.array)),0);
  assert.equal(Math.max(...Array.from(attr.array)),1);
 }
 const compiled=shader();
 barrel.material.onBeforeCompile(compiled,null);
 assert.match(compiled.vertexShader,/attribute float fieldworkPieceHeight/);
 assert.match(compiled.vertexShader,/vFWPieceHeight=fieldworkPieceHeight/);
 assert.match(compiled.fragmentShader,/fwPieceLower=1\.0-smoothstep/);
 assert.match(compiled.fragmentShader,/outgoingLight\*vec3\(\.43,\.46,\.79\)/);
 assert.equal(compiled.fragmentShader.includes('\\n'),false,
  'GLSL must have real source newlines rather than escaped backslashes');
 assert.match(compiled.fragmentShader,/fwWarm=step/);
 assert.match(compiled.fragmentShader,/fwWhite=step/);
 assert.equal(compiled.uniforms.fieldworkRimStrength.value,.24);
 assert.equal(studioArtRole(barrel,barrel.material.userData.fieldworkStudioArtOriginal??uniform),'hard');
 disposeStudioGraphicLighting(rig);
 assert.equal(pouch.material,uniform);
 assert.equal(plate.material,uniform);
 assert.ok(barrel.material instanceof THREE.MeshStandardMaterial);
});
test('R7.10 merged gear has one complete gradient per original pouch span',()=>{
 const merged=new THREE.BufferGeometry();
 merged.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,0, 1,0,0, 0,3,0, 1,3,0,
  4,30,0, 5,30,0, 4,34,0, 5,34,0
 ],3));
 merged.userData.fieldworkLightingPartSpans=[
  {partId:'pouch-a',role:'fabric',start:0,count:4},
  {partId:'pouch-b',role:'fabric',start:4,count:4}
 ];
 assert.equal(ensureStudioPieceGradient(merged),true);
 const attr=merged.getAttribute('fieldworkPieceHeight');
 assert.deepEqual(Array.from(attr.array),[0,0,1,1,0,0,1,1],
  'Second pouch resets to its own bottom despite merged geometry');
 assert.equal(ensureStudioPieceGradient(merged),true);
 assert.equal(merged.getAttribute('fieldworkPieceHeight'),attr,
  'Repeated UI changes must not allocate more vertex buffers');
});
test('R7.10 rim amount changes live without recompiling a shader variant',()=>{
 const rig=new THREE.Group(),material=new THREE.MeshStandardMaterial({
  color:0x767c65
 });
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(3,4,3),material);
 rig.add(mesh);
 applyStudioGraphicLighting(rig,look({rim:'dual',rimAmount:.15,toon:0}));
 const first=mesh.material;
 const compiled=shader();first.onBeforeCompile(compiled,null);
 const rim=compiled.uniforms.fieldworkRimStrength;
 assert.equal(rim.value,.15);
 const key=first.customProgramCacheKey();
 applyStudioGraphicLighting(rig,look({rim:'dual',rimAmount:.42,toon:0}));
 assert.equal(mesh.material,first,'material is cached across slider updates');
 assert.equal(first.customProgramCacheKey(),key);
 assert.equal(rim.value,.42,'compiled GPU uniform is updated');
 restoreStudioGraphicLighting(rig);
 assert.equal(mesh.material,material);
 disposeStudioGraphicLighting(rig);
});
test('R7.10 transparent pieces are preserved and pose-cavity shader composes',()=>{
 const root=new THREE.Group(),fabric=new THREE.MeshStandardMaterial({
  color:0x777766,vertexColors:true
 });
 const thighMat=fabric.clone();
 const torso=new THREE.Mesh(new THREE.BoxGeometry(),fabric);
 const legs=[new THREE.Mesh(new THREE.BoxGeometry(),thighMat),
  new THREE.Mesh(new THREE.BoxGeometry(),thighMat)];
 const glassMaterial=new THREE.MeshStandardMaterial({
  transparent:true,opacity:.48
 });
 const glass=new THREE.Mesh(new THREE.BoxGeometry(),glassMaterial);
 root.add(torso,...legs,glass);
 const cavity=createOperatorPoseCavity(torso,legs,fabric,thighMat);
 cavity.torso.value.set(.23,.88);
 const result=applyStudioGraphicLighting(root,
  look({toon:2,rim:'dual',gradient:'piece'}));
 assert.equal(result.meshes,3);
 assert.equal(glass.material,glassMaterial);
 const composed=shader();torso.material.onBeforeCompile(composed,null);
 assert.equal(composed.uniforms.fieldworkCavity.value,cavity.torso.value);
 assert.match(composed.fragmentShader,/diffuseColor\.rgb\*=1\.0-clamp\(cavity/);
 assert.match(composed.fragmentShader,/fwPieceLower/);
 disposeStudioGraphicLighting(root);
 assert.equal(torso.material,cavity.torso.material);
});
test('R7.10 original comparison is reversible and old URL presets are simplified',()=>{
 const url=studioLightLabFromQuery('?operatorLightingToon=3&operatorRim=pixel'+
  '&operatorGradient=violet-noir&operatorShadowColor=steel');
 assert.deepEqual({toon:url.toon,rim:url.rim,gradient:url.gradient,shadow:url.shadow},
  {toon:2,rim:'dual',gradient:'piece',shadow:'plum-plus'});
 assert.deepEqual(effectiveStudioLightLab(url,true),DEFAULT_STUDIO_LIGHT_LAB);
 assert.deepEqual(effectiveStudioLightLab(url,false),url);
 const invalid=new THREE.BufferGeometry();
 assert.equal(ensureStudioPieceGradient(invalid),false);
});
