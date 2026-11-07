import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 applyStudioGraphicLighting,restoreStudioGraphicLighting,
 disposeStudioGraphicLighting,updateStudioCelRamp,
 ensureStudioPieceGradient,studioPieceGradientEligible
} from '../src/operator-studio-graphic-lighting.ts';
import {studioContourEligible}
 from '../src/operator-studio-rim-contour.ts';
import {DEFAULT_STUDIO_LIGHT_LAB,studioLightLabFromQuery,
 effectiveStudioLightLab} from '../src/operator-studio-light-lab.ts';
import {createOperatorPoseCavity} from '../src/operator-pose-cavity-lighting.ts';
const look=(settings={})=>({...DEFAULT_STUDIO_LIGHT_LAB,...settings});
const shader=()=>({
 vertexShader:'#include <begin_vertex>',
 fragmentShader:'#include <color_fragment>\n'+
  'vec3 outgoingLight=vec3(.5);\n#include <opaque_fragment>',
 uniforms:{}
});
const cube=(material=new THREE.MeshStandardMaterial({color:0x787c75}))=>
 new THREE.Mesh(new THREE.BoxGeometry(3,4,3),material);

test('R7.11 graphic cel keeps one shared texture at 70% and edits in place',()=>{
 const ramp=updateStudioCelRamp(2,'graphic',.70,.84);
 assert.equal(ramp.image.width,128);
 assert.equal(ramp.magFilter,THREE.NearestFilter);
 const first=Array.from(ramp.image.data);
 assert.equal(updateStudioCelRamp(2,'graphic',.78,.84),ramp);
 assert.notDeepEqual(Array.from(ramp.image.data),first);
});
test('R7.11 every merged pouch span still resets its own bottom',()=>{
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,0,1,0,0,0,3,0,1,3,0,
  4,30,0,5,30,0,4,34,0,5,34,0
 ],3));
 geometry.userData.fieldworkLightingPartSpans=[
  {start:0,count:4,partId:'pouch-a'},
  {start:4,count:4,partId:'pouch-b'}
 ];
 assert.equal(ensureStudioPieceGradient(geometry),true);
 assert.deepEqual(Array.from(geometry.getAttribute('fieldworkPieceHeight').array),
  [0,0,1,1,0,0,1,1]);
 const original=geometry.getAttribute('fieldworkPieceHeight');
 assert.equal(ensureStudioPieceGradient(geometry),true);
 assert.equal(geometry.getAttribute('fieldworkPieceHeight'),original);
});
test('R7.11 thigh and arm exclusions do not spread to hands or shins',()=>{
 const root=new THREE.Group();
 const fabric=new THREE.MeshStandardMaterial({color:0x787c75});
 const upperLeg=cube(fabric),shin=cube(fabric);
 const arm=cube(fabric),hand=cube(fabric),glove=cube(fabric);
 const pouch=cube(fabric);
 upperLeg.userData.fieldworkStudioHeightRole='exclude';
 shin.userData.fieldworkStudioHeightRole='include';
 arm.userData.fieldworkStudioHeightRole='exclude';
 hand.userData.fieldworkStudioHeightRole='include';
 arm.add(hand);hand.add(glove);
 root.add(upperLeg,shin,arm,pouch);
 assert.equal(studioPieceGradientEligible(upperLeg),false);
 assert.equal(studioPieceGradientEligible(shin),true);
 assert.equal(studioPieceGradientEligible(arm),false);
 assert.equal(studioPieceGradientEligible(hand),true);
 assert.equal(studioPieceGradientEligible(glove),true);
 const converted=applyStudioGraphicLighting(root,
  look({toon:2,gradient:'piece',rim:'off'}));
 assert.equal(converted.meshes,6);
 assert.equal(upperLeg.geometry.getAttribute('fieldworkPieceHeight'),undefined);
 assert.equal(arm.geometry.getAttribute('fieldworkPieceHeight'),undefined);
 for(const node of [shin,hand,glove,pouch])
  assert.ok(node.geometry.getAttribute('fieldworkPieceHeight'));
 const upperShader=shader();upperLeg.material.onBeforeCompile(upperShader,null);
 assert.doesNotMatch(upperShader.fragmentShader,/fwPieceLower/);
 const shinShader=shader();shin.material.onBeforeCompile(shinShader,null);
 assert.match(shinShader.fragmentShader,/fwPieceLower/);
 assert.match(shinShader.fragmentShader,/outgoingLight\*=1\.0-\.19/);
 assert.doesNotMatch(shinShader.fragmentShader,/vec3\(\.43,\.46,\.79\)/);
 disposeStudioGraphicLighting(root);
 assert.equal(upperLeg.material,fabric);
 assert.equal(hand.material,fabric);
});
test('R7.11 optional gray-rose is weak and not a second plum wash',()=>{
 const root=new THREE.Group(),mesh=cube();root.add(mesh);
 applyStudioGraphicLighting(root,look({gradient:'piece-rose',toon:0}));
 const compiled=shader();mesh.material.onBeforeCompile(compiled,null);
 assert.match(compiled.fragmentShader,/fwPieceLower/);
 assert.match(compiled.fragmentShader,/vec3\(\.98,\.935,\.945\)/);
 assert.doesNotMatch(compiled.fragmentShader,/\.36,\.33,\.78/);
 disposeStudioGraphicLighting(root);
});
test('R7.11 true contours exclude cloth, soft pouches and covered helmets',()=>{
 const root=new THREE.Group();
 const fabric=new THREE.MeshStandardMaterial({color:0x827760});
 fabric.userData.fieldworkFabric=true;
 const metal=new THREE.MeshStandardMaterial({metalness:.6});
 const shell=new THREE.MeshStandardMaterial({color:0x42484a,roughness:.9});
 const cloth=cube(fabric),pouch=cube(fabric),knob=cube(metal);
 const weapon=new THREE.Group();weapon.userData.fieldworkWeaponPresentation=true;
 const receiver=cube();weapon.add(receiver);
 const coveredHelmet=new THREE.Group();
 coveredHelmet.userData.fieldworkStudioBareShellMaterial=null;
 const coveredShell=cube(shell);coveredHelmet.add(coveredShell);
 const bareHelmet=new THREE.Group();
 bareHelmet.userData.fieldworkStudioBareShellMaterial=shell;
 const bareShell=cube(shell),clothCover=cube(fabric);
 bareHelmet.add(bareShell,clothCover);
 root.add(cloth,pouch,knob,weapon,coveredHelmet,bareHelmet);
 assert.equal(studioContourEligible(cloth,fabric),false);
 assert.equal(studioContourEligible(pouch,fabric),false);
 assert.equal(studioContourEligible(knob,metal),true);
 assert.equal(studioContourEligible(receiver,receiver.material),true);
 assert.equal(studioContourEligible(coveredShell,shell),false);
 assert.equal(studioContourEligible(bareShell,shell),true);
 assert.equal(studioContourEligible(clothCover,fabric),false);
 const result=applyStudioGraphicLighting(root,look({rim:'dual',rimAmount:.10}));
 assert.equal(result.meshes,3,'only receiver, metal and bare helmet');
 for(const node of [cloth,pouch,coveredShell,clothCover])
  assert.equal(node.userData.fieldworkStudioContourMesh,undefined);
 for(const node of [knob,receiver,bareShell])
  assert.ok(node.userData.fieldworkStudioContourMesh);
 const contour=receiver.userData.fieldworkStudioContourMesh;
 assert.equal(contour.material.side,THREE.BackSide);
 assert.equal(contour.material.opacity,.10);
 assert.equal(contour.material.depthWrite,false);
 const live={vertexShader:'#include <begin_vertex>'};
 contour.material.onBeforeCompile(live,null);
 assert.match(live.vertexShader,/transformed \+= normalize\(normal\) \* 0\.32/);
 assert.doesNotMatch(live.vertexShader,/fwPattern|fwCells/);
 applyStudioGraphicLighting(root,look({rim:'dual',rimAmount:.15}));
 assert.equal(receiver.userData.fieldworkStudioContourMesh,contour);
 assert.equal(contour.material.opacity,.15,'rim strength is updated, no redraw');
 applyStudioGraphicLighting(root,look());
 assert.equal(receiver.userData.fieldworkStudioContourMesh,undefined);
 disposeStudioGraphicLighting(root);
});
test('R7.11 pose-cavity uniforms still compose with monochrome two-band cel',()=>{
 const root=new THREE.Group(),fabric=new THREE.MeshStandardMaterial({
  color:0x777766,vertexColors:true
 });
 const thighs=fabric.clone(),chest=cube(fabric),legs=[cube(thighs),cube(thighs)];
 root.add(chest,...legs);
 const cavity=createOperatorPoseCavity(chest,legs,fabric,thighs);
 cavity.torso.value.set(.23,.88);
 applyStudioGraphicLighting(root,look({toon:2,gradient:'piece'}));
 const compiled=shader();chest.material.onBeforeCompile(compiled,null);
 assert.equal(compiled.uniforms.fieldworkCavity.value,cavity.torso.value);
 assert.match(compiled.fragmentShader,/diffuseColor\.rgb\*=1\.0-clamp\(cavity/);
 disposeStudioGraphicLighting(root);
 assert.equal(chest.material,cavity.torso.material);
});
test('R7.11 default is unchanged and legacy blue URL resolves to grayscale',()=>{
 const old=studioLightLabFromQuery(
  '?operatorLightingToon=3&operatorRim=pixel&operatorGradient=violet-noir&operatorShadowColor=steel');
 assert.deepEqual({toon:old.toon,rim:old.rim,gradient:old.gradient,shadow:old.shadow},
  {toon:2,rim:'dual',gradient:'piece',shadow:'plum-plus'});
 assert.equal(old.rimAmount,.10);
 assert.deepEqual(effectiveStudioLightLab(old,true),DEFAULT_STUDIO_LIGHT_LAB);
 assert.equal(ensureStudioPieceGradient(new THREE.BufferGeometry()),false);
});
