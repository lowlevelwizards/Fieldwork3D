import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyStudioGraphicLighting,restoreStudioGraphicLighting,
 disposeStudioGraphicLighting,updateStudioCelRamp,
 ensureStudioPieceGradient,ensureStudioRimBounds,
 studioPieceGradientEligible,
 injectStudioCelEdgeAA,requestedStudioGraphicDiagnostics}
 from '../src/operator-studio-graphic-lighting.ts';
import {studioContourEligible}
 from '../src/operator-studio-rim-contour.ts';
import {requestedStudioRenderQuality,studioQualityLink}
 from '../src/operator-studio-render-quality.ts';
import {DEFAULT_STUDIO_LIGHT_LAB,studioLightLabFromQuery,
 effectiveStudioLightLab} from '../src/operator-studio-light-lab.ts';
import {createOperatorPoseCavity}
 from '../src/operator-pose-cavity-lighting.ts';
const look=(options={})=>({...DEFAULT_STUDIO_LIGHT_LAB,...options});
const shader=()=>({
 vertexShader:'#include <begin_vertex>',
 fragmentShader:'#include <gradientmap_pars_fragment>\n'+
  '#include <color_fragment>\nvec3 outgoingLight=vec3(.5);\n'+
  '#include <opaque_fragment>',
 uniforms:{}
});
const cube=(material=new THREE.MeshStandardMaterial({color:0x778177}))=>
 new THREE.Mesh(new THREE.BoxGeometry(3,4,3),material);

test('R7.13 visible near-white lit rim stays on surfaces with no halo',()=>{
 const root=new THREE.Group(),metal=new THREE.MeshStandardMaterial({metalness:.68});
 const weapon=new THREE.Group();
 weapon.userData.fieldworkWeaponPresentation=true;
 const receiver=cube();weapon.add(receiver);
 const buckle=cube(metal);
 const fabric=new THREE.MeshStandardMaterial({color:0x837860});
 fabric.userData.fieldworkFabric=true;
 const uniform=cube(fabric);
 root.add(weapon,buckle,uniform);
 assert.equal(studioContourEligible(receiver,receiver.material),true);
 assert.equal(studioContourEligible(buckle,metal),true);
 assert.equal(studioContourEligible(uniform,fabric),false);
 const render=applyStudioGraphicLighting(root,look({rim:'dual',rimAmount:.80}));
 assert.equal(render.weapons,1);
 assert.equal(root.children.length,3,'no new top-level silhouette hull');
 assert.equal(weapon.children.length,1,'receiver does not grow duplicate hull');
 assert.equal(receiver.userData.fieldworkStudioContourMesh,undefined);
 const rimMin=receiver.geometry.getAttribute('fieldworkRimBoundsMin');
 const rimMax=receiver.geometry.getAttribute('fieldworkRimBoundsMax');
 assert.ok(rimMin&&rimMax,'rim uses original mesh bounding-box attributes');
 assert.equal(rimMin.count,receiver.geometry.getAttribute('position').count);
 assert.equal(ensureStudioRimBounds(receiver.geometry),true);
 assert.equal(receiver.geometry.getAttribute('fieldworkRimBoundsMin'),rimMin);
 assert.notEqual(uniform.material,fabric,
  'gear ink must tint the ORIGINAL solid surface');
 assert.equal(uniform.material.userData.fieldworkStudioArtOnly,true);
 assert.equal(uniform.children.length,0,'no external halo geometry or draw calls');
 const gearShader=shader();
 uniform.material.onBeforeCompile(gearShader,null);
 assert.equal(gearShader.uniforms.fieldworkRimRole.value,1);
 assert.equal(gearShader.uniforms.fieldworkRimFabricWidth.value,2.8);
 assert.equal(gearShader.uniforms.fieldworkRimFabricLightThreshold.value,.65);
 assert.match(gearShader.fragmentShader,/fwSoftLightPeak/);
 assert.match(gearShader.fragmentShader,/fwTravel\*fwSingleEdge/);
 assert.match(gearShader.fragmentShader,/fwFacesKey\*fwSoftLightPeak/);
 assert.match(gearShader.fragmentShader,/smoothstep\(\.25,\.75,fwKeyShadow\)/);
 assert.doesNotMatch(gearShader.fragmentShader,/fwRearNormal|fwBackGate/);
 assert.match(gearShader.fragmentShader,/fwSoftBorder/);
 assert.match(gearShader.fragmentShader,/fwSoftBand/);
 assert.match(gearShader.fragmentShader,/fwSecond/);
 assert.doesNotMatch(gearShader.vertexShader,/normalize\(normal\)\*fwBleedWidth/);
 const mock=shader();
 receiver.material.onBeforeCompile(mock,null);
 assert.match(mock.fragmentShader,/getShadowMask\(\)/);
 assert.match(mock.fragmentShader,/fwFacesKey/);
 assert.match(mock.fragmentShader,/fwReceivedLight/);
 assert.match(mock.fragmentShader,/fwTarget/);
 assert.match(mock.fragmentShader,/fieldworkRimRole/);
 assert.match(mock.fragmentShader,/fwTravel/);
 assert.match(mock.fragmentShader,/fwSingleEdge/);
 assert.match(mock.fragmentShader,/fieldworkRimWidth/);
 assert.match(mock.fragmentShader,/fieldworkRimCoverage/);
 assert.match(mock.fragmentShader,/fieldworkRimKeyWorld/);
 assert.match(mock.fragmentShader,/fieldworkRimSkin/);
 assert.match(mock.fragmentShader,/fieldworkRimFabric/);
 assert.match(mock.fragmentShader,/fieldworkRimAngleLooseness/);
 assert.doesNotMatch(mock.fragmentShader,/outgoingLight\+=vec3\(\.96,\.88,\.74\)/);
 assert.match(mock.fragmentShader,/fieldworkRimStrength/);
 assert.match(mock.fragmentShader,/fwidth\(fwGrazing\)/);
 assert.match(mock.fragmentShader,/fwSecond=fwBoundDist/);
 assert.match(mock.fragmentShader,/fwGeometricEdge/);
 assert.match(mock.fragmentShader,/fwEdge\*=fwGeometricEdge/);
 assert.match(mock.vertexShader,/attribute vec3 fieldworkRimBoundsMin/);
 assert.doesNotMatch(mock.vertexShader,/transformed \+= normalize\(normal\)/);
 assert.doesNotMatch(mock.fragmentShader,/fwPattern|fwCells/);
 const uniformRef=mock.uniforms.fieldworkRimStrength;
 assert.equal(uniformRef.value,.80);
 assert.equal(mock.uniforms.fieldworkRimCoverage.value,.55);
 assert.equal(mock.uniforms.fieldworkRimWidth.value,2.5);
 assert.equal(mock.uniforms.fieldworkRimAngleLooseness.value,1.25);
 const variant=receiver.material,programKey=variant.customProgramCacheKey();
 applyStudioGraphicLighting(root,look({rim:'dual',rimAmount:.95}));
 assert.equal(receiver.material,variant);
 assert.equal(variant.customProgramCacheKey(),programKey);
 assert.equal(uniformRef.value,.95);
 assert.equal(mock.uniforms.fieldworkRimCoverage.value,.55);
 restoreStudioGraphicLighting(root);
 assert.ok(receiver.material instanceof THREE.MeshStandardMaterial);
 disposeStudioGraphicLighting(root);
});
test('R7.12 bare helmet only, not fabric covers, glasses or skin',()=>{
 const shell=new THREE.MeshStandardMaterial({color:0x34373a});
 const cloth=new THREE.MeshStandardMaterial({color:0x988d77});
 cloth.userData.fieldworkFabric=true;
 const headwear=new THREE.Group();
 const head=cube(shell),cover=cube(cloth);headwear.add(head,cover);
 headwear.userData.fieldworkStudioBareShellMaterial=null;
 assert.equal(studioContourEligible(head,shell),false);
 headwear.userData.fieldworkStudioBareShellMaterial=shell;
 assert.equal(studioContourEligible(head,shell),true);
 assert.equal(studioContourEligible(cover,cloth),false);
 const lenses=cube(new THREE.MeshStandardMaterial({transparent:true,opacity:.5}));
 assert.equal(studioContourEligible(lenses,lenses.material),false);
});
test('R7.12 2-band cel uses fwidth screen-pixel transitions, not blurred camo',()=>{
 const fragment=shader();
 assert.equal(injectStudioCelEdgeAA(fragment,true),true);
 assert.match(fragment.fragmentShader,/fwidth\(coord\)/);
 assert.match(fragment.fragmentShader,/fieldworkCelCutoff/);
 assert.match(fragment.fragmentShader,/getGradientIrradiance/);
 assert.doesNotMatch(fragment.fragmentShader,/texture2D\( *gradientMap/);
 const hard=shader();
 assert.equal(injectStudioCelEdgeAA(hard,false),false);
 assert.match(hard.fragmentShader,/#include <gradientmap_pars_fragment>/);
 const ramp=updateStudioCelRamp(2,'graphic',.70,.84);
 assert.equal(ramp.magFilter,THREE.NearestFilter);
 const first=Array.from(ramp.image.data);
 assert.equal(updateStudioCelRamp(2,'graphic',.78,.84),ramp);
 assert.notDeepEqual(Array.from(ramp.image.data),first);
});
test('R7.12 preserve gradient on merged pouches and hands/shins only',()=>{
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,0,1,0,0,0,3,0,1,3,0,
  4,30,0,5,30,0,4,34,0,5,34,0
 ],3));
 geometry.userData.fieldworkLightingPartSpans=[
  {start:0,count:4},{start:4,count:4}
 ];
 assert.equal(ensureStudioPieceGradient(geometry),true);
 assert.deepEqual(Array.from(geometry.getAttribute('fieldworkPieceHeight').array),
  [0,0,1,1,0,0,1,1]);
 const arm=new THREE.Group(),hand=cube(),thigh=cube(),shin=cube();
 arm.userData.fieldworkStudioHeightRole='exclude';
 hand.userData.fieldworkStudioHeightRole='include';arm.add(hand);
 thigh.userData.fieldworkStudioHeightRole='exclude';
 shin.userData.fieldworkStudioHeightRole='include';
 assert.equal(studioPieceGradientEligible(hand),true);
 assert.equal(studioPieceGradientEligible(thigh),false);
 assert.equal(studioPieceGradientEligible(shin),true);
});
test('R7.12 pose-cavity shader still composes with cel and gray gradient',()=>{
 const root=new THREE.Group(),fabric=new THREE.MeshStandardMaterial({
  color:0x777766,vertexColors:true
 });
 const legsMaterial=fabric.clone();
 const chest=cube(fabric),legs=[cube(legsMaterial),cube(legsMaterial)];
 root.add(chest,...legs);
 const cavity=createOperatorPoseCavity(chest,legs,fabric,legsMaterial);
 cavity.torso.value.set(.23,.88);
 applyStudioGraphicLighting(root,look({toon:2,gradient:'piece',rim:'off'}));
 const compiled=shader();
 chest.material.onBeforeCompile(compiled,null);
 assert.equal(compiled.uniforms.fieldworkCavity.value,cavity.torso.value);
 assert.match(compiled.fragmentShader,/diffuseColor\.rgb\*=1\.0-clamp\(cavity/);
 assert.match(compiled.fragmentShader,/fwPieceLower/);
 disposeStudioGraphicLighting(root);
 assert.equal(chest.material,cavity.torso.material);
});
test('R7.12 A/B modes preserve safe no-AA/hard-shadow/off-bake fallback',()=>{
 const standard=requestedStudioRenderQuality('',3);
 assert.equal(standard.canvasAA,true);
 assert.equal(standard.pixelRatio,1.5);
 assert.equal(standard.shadowFilter,'soft');
 assert.equal(standard.shadowSize,2048);
 assert.equal(standard.shadowBias,'stable');
 const off=requestedStudioRenderQuality(
  '?studioAA=off&studioPixelRatio=2&studioShadowFilter=hard&'+
  'studioLiveShadows=off&studioCelAA=off&studioBakedLighting=off',3);
 assert.equal(off.canvasAA,false);
 assert.equal(off.pixelRatio,2);
 assert.equal(off.shadowFilter,'hard');
 assert.equal(requestedStudioRenderQuality(
  '?studioShadowSize=2048&studioShadowBias=legacy&studioShadowFilter=pcf',
  3).shadowSize,2048);
 assert.equal(off.liveShadows,false);
 assert.deepEqual(requestedStudioGraphicDiagnostics(
  '?studioCelAA=off&studioBakedLighting=off'),
  {celAA:false,bakedVertexLighting:false});
 const url=studioQualityLink('https://example.org/operator-studio.html?x=1',
  {studioAA:'off',studioShadowFilter:'pcf'});
 assert.match(url,/studioAA=off/);
 assert.match(url,/x=1/);
});
test('R7.12 original Look restores with direct-light rim disabled',()=>{
 const original=DEFAULT_STUDIO_LIGHT_LAB;
 const q=studioLightLabFromQuery('?operatorLightingToon=2&operatorRim=dual'+
  '&operatorRimAmount=0.10&operatorGradient=piece&operatorShadowColor=plum-plus');
 assert.deepEqual(effectiveStudioLightLab(q,true),original);
 assert.equal(q.rimAmount,.10);
 assert.equal(ensureStudioPieceGradient(new THREE.BufferGeometry()),false);
});

test('R7.17 cream and skin glints land only on illuminated original mesh edges',()=>{
 const root=new THREE.Group();
 const skin=new THREE.MeshStandardMaterial({color:0x55372c});
 skin.userData.fieldworkStudioSkin=true;
 const cloth=new THREE.MeshStandardMaterial({color:0x857354});
 cloth.userData.fieldworkFabric=true;
 const head=cube(skin),shirt=cube(cloth);
 root.add(head,shirt);
 const audition=look({rim:'dual',rimAmount:.9,
  rimWidth:3.5,rimCoverage:.6,rimAngleLooseness:1.4,
  rimFabricWidth:3,rimFabricOpacity:.14,rimFabricLightThreshold:.9,
  rimSkinWidth:3.2,rimSkinOpacity:.34,rimSkinLightThreshold:.8,
  rimSkinWarmth:1.25,rimDebugMask:true,lightAzimuth:45});
 const oldGeo=head.geometry,oldClothGeo=shirt.geometry;
 applyStudioGraphicLighting(root,audition);
 assert.notEqual(head.material,skin);
 assert.notEqual(shirt.material,cloth);
 assert.equal(head.geometry,oldGeo,'no skin vertex expansion');
 assert.equal(shirt.geometry,oldClothGeo,'no garment vertex expansion');
 assert.equal(head.children.length,0,'no separate glow hull on skin');
 assert.equal(shirt.children.length,0,'no separate glow hull on gear');
 const sk=shader();head.material.onBeforeCompile(sk,null);
 const cl=shader();shirt.material.onBeforeCompile(cl,null);
 assert.equal(sk.uniforms.fieldworkRimRole.value,2);
 assert.equal(sk.uniforms.fieldworkRimSkinWidth.value,3.2);
 assert.equal(sk.uniforms.fieldworkRimSkin.value,.34);
 assert.equal(sk.uniforms.fieldworkRimSkinLightThreshold.value,.8);
 assert.equal(sk.uniforms.fieldworkRimSkinWarmth.value,1.25);
 assert.equal(cl.uniforms.fieldworkRimRole.value,1);
 assert.equal(cl.uniforms.fieldworkRimFabric.value,.14);
 assert.equal(cl.uniforms.fieldworkRimFabricWidth.value,3);
 assert.equal(cl.uniforms.fieldworkRimFabricLightThreshold.value,.9);
 assert.match(sk.fragmentShader,/fwSkinTint/);
 assert.match(sk.fragmentShader,/fwSoftView/);
 assert.match(sk.fragmentShader,/fwSoftLightPeak/);
 assert.match(sk.fragmentShader,/fwFacesKey\*fwSoftLightPeak/);
 assert.match(sk.fragmentShader,/fwDirect/);
 assert.doesNotMatch(sk.fragmentShader,/fwRearNormal|fwRearKey|fwSoftBackGate|fwBacklit/);
 assert.match(sk.fragmentShader,/fwSoftBorder/);
 assert.doesNotMatch(sk.vertexShader,/expanded=position|gl_Position=projectionMatrix\*view/);
 assert.doesNotMatch(sk.fragmentShader,/gl_FragColor=vec4\(ink,alpha\)/);
 const variant=head.material,programKey=variant.customProgramCacheKey();
 applyStudioGraphicLighting(root,{...audition,rimSkinOpacity:.22,
  rimSkinLightThreshold:.25,lightAzimuth:90});
 assert.equal(head.material,variant,'cached shader updates without recompilation');
 assert.equal(variant.customProgramCacheKey(),programKey);
 assert.equal(sk.uniforms.fieldworkRimSkin.value,.22);
 assert.equal(sk.uniforms.fieldworkRimSkinLightThreshold.value,.25);
 assert.equal(head.children.length,0);
 applyStudioGraphicLighting(root,look({rim:'off',toon:0}));
 assert.equal(head.material,skin);
 assert.equal(shirt.material,cloth);
 disposeStudioGraphicLighting(root);
});
test('R7.16 merged gear keeps per-part bounds so no cross-part false bands',()=>{
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute([
  0,0,0,2,0,0,2,3,1,0,3,1,
  20,5,2,23,5,2,23,9,3,20,9,3
 ],3));
 g.userData.fieldworkLightingPartSpans=[{start:0,count:4},{start:4,count:4}];
 assert.equal(ensureStudioRimBounds(g),true);
 const min=g.getAttribute('fieldworkRimBoundsMin');
 const max=g.getAttribute('fieldworkRimBoundsMax');
 assert.equal(min.getX(0),0);
 assert.equal(max.getX(0),2);
 assert.equal(min.getX(5),20);
 assert.equal(max.getX(5),23);
 assert.equal(max.getY(0),3);
 assert.equal(max.getY(5),9);
 assert.equal(ensureStudioRimBounds(g),true);
});
