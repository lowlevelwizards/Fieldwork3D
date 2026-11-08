import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioLightLabFromQuery,effectiveStudioLightLab,
 DEFAULT_STUDIO_LIGHT_LAB,APPROVED_GRAPHIC_LIGHTING,studioLightLabLabel}
 from '../src/operator-studio-light-lab.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('R7.10 original remains default with transient preview-only settings',()=>{
 assert.deepEqual(studioLightLabFromQuery(''),APPROVED_GRAPHIC_LIGHTING);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.toon,3);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.shadow,'plum-plus');
 assert.equal(APPROVED_GRAPHIC_LIGHTING.gradient,'piece-rose');
 assert.equal(APPROVED_GRAPHIC_LIGHTING.rimAmount,.42);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.rimWidth,2);
 assert.equal(APPROVED_GRAPHIC_LIGHTING.rimCoverage,.40);
 assert.equal(studioLightLabLabel(DEFAULT_STUDIO_LIGHT_LAB),'ORIGINAL');
 assert.deepEqual(effectiveStudioLightLab(DEFAULT_STUDIO_LIGHT_LAB),
  DEFAULT_STUDIO_LIGHT_LAB);
});
test('R7.10 previous art links normalize into the actual compact selections',()=>{
 const state=studioLightLabFromQuery(
  '?operatorLightingToon=3&operatorRim=pixel&operatorGradient=violet-noir&operatorShadowColor=steel');
 assert.equal(state.toon,3);
 assert.equal(state.rim,'dual');
 assert.equal(state.gradient,'piece');
 assert.equal(state.shadow,'plum-plus');
 assert.equal(state.celProfile,'graphic');
 assert.equal(state.celLow,.70);
 assert.equal(state.rimAmount,.85);
 assert.deepEqual(effectiveStudioLightLab(state,true),DEFAULT_STUDIO_LIGHT_LAB);
 assert.deepEqual(effectiveStudioLightLab(state,false),state);
});
test('R7.10 two-band threshold and independent graphic rim amount are bounded',()=>{
 const q=studioLightLabFromQuery(
  '?operatorLightingToon=2&operatorRim=dual&operatorCelLow=0.70&operatorRimAmount=0.12');
 assert.equal(q.celLow,.70);
 assert.equal(q.rimAmount,.12);
 assert.equal(effectiveStudioLightLab({...q,toon:0}).rim,'dual');
 const constrained=effectiveStudioLightLab({...q,rimAmount:2});
 assert.equal(constrained.rimAmount,1);
 assert.equal(studioLightLabFromQuery('?operatorRimAmount=not-a-number').rimAmount,.85);
});
test('R7.10 Lighting Lab presents only usable user-selected choices',()=>{
 const html=read('operator-studio.html');
 for(const id of ['studioLightLab','studioLightCel','studioLightRim',
  'studioLightGradient','studioLightShadow','studioCelLow',
  'studioRimAmount','studioCelLowWrap','studioRimAmountWrap',
  'studioLightCompare','studioLightReset','studioLightShowWeapon'])
  assert.match(html,new RegExp('id="'+id+'"'));
 for(const removed of ['studioCelHigh','studioCelProfile','studioLightScope'])
  assert.doesNotMatch(html,new RegExp('id="'+removed+'"'));
 assert.match(html,/3-band · very graphic · highlight/);
 assert.match(html,/Each item · soft grayscale/);
 assert.match(html,/Each item · dusty gray-rose/);
 assert.match(html,/Subtle white glints · weapons only/);
 assert.match(html,/HARD GLINT OPACITY/);
 assert.match(html,/id="studioRimAmount"[^>]*max="1"[^>]*value="0.42"/);
 assert.match(html,/Saturated plum/);
 assert.match(html,/PREVIEW WITH WEAPON/);
 for(const id of ['studioRimWidth','studioRimCoverage','studioRimAngle',
  'studioRimFabricWidth','studioRimFabric','studioRimFabricLightThreshold',
  'studioRimSkinWidth','studioRimSkin','studioRimSkinLightThreshold',
  'studioRimSkinWarmth','studioLightAzimuth','studioRimMask'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/OPEN 3D ARSENAL LIGHTING LAB/);
 const ts=read('src/operator-studio.ts');
 assert.match(ts,/labCelLowWrap\.hidden=!celOn/);
 assert.match(ts,/labRimAmountWrap\.hidden=!rimOn/);
 assert.match(ts,/addEventListener\('input',readSlider\)/);
 assert.match(ts,/addEventListener\('change',readSlider\)/);
 assert.match(ts,/lightLabCompareOriginal=!lightLabCompareOriginal/);
 assert.match(ts,/lightLabSettings=approvedGraphicLighting\(\)/);
 assert.match(ts,/thumbBrowser\.setLightingSettings\(live\)/);
 assert.match(ts,/applyStudioGraphicLighting\(rig\.root,light\)/);
});
test('R7.10 lighting cannot be stored in roster or loadout',()=>{
 const ts=read('src/operator-studio.ts');
 const settings=read('src/operator-studio-light-lab.ts');
 assert.match(settings,/Nothing here is persisted/);
 assert.match(ts,/window\.parent\.postMessage\(\{type:'fw-studio-commit-batch',entries\}/);
 assert.doesNotMatch(settings,/localStorage|sessionStorage/);
 const grid=read('src/operator-appearance-grid.ts');
 assert.match(grid,/setLightingSettings\(settings:StudioLightLabSettings\)/);
 assert.match(grid,/previous\.rimAmount===settings\.rimAmount/);
 assert.match(grid,/this\.cache\.clear\(\)/);
});

test('R7.14 Arsenal Lab uses actual Workbench 3D scene and avoids save pollution',()=>{
 const lab=read('src/arsenal/lighting-lab.ts');
 const viewer=read('src/arsenal/viewport.ts');
 const screen=read('src/arsenal/workbench-screen.ts');
 assert.match(lab,/mountArsenalLightingLab/);
 assert.match(lab,/COMPARE ORIGINAL/);
 assert.match(lab,/SINGLE-EDGE COVERAGE/);
 assert.match(lab,/KEY LIGHT ORBIT/);
 assert.doesNotMatch(lab,/localStorage|sessionStorage|persistArsenal/);
 assert.match(viewer,/applyStudioGraphicLighting\(this\.model,settings\)/);
 assert.match(viewer,/disposeStudioGraphicLighting\(this\.model\)/);
 assert.match(screen,/mountArsenalLightingLab\(panel/);
});

test('R7.15 hard/gear/skin settings are independent, clamped and preview-only',()=>{
 const d=DEFAULT_STUDIO_LIGHT_LAB;
 assert.equal(d.rimWidth,2.5);
 assert.equal(d.rimCoverage,.55);
 assert.equal(d.rimAngleLooseness,1.25);
 assert.equal(d.rimFabricWidth,2.8);
 assert.equal(d.rimFabricOpacity,0);
 assert.equal(d.rimFabricLightThreshold,.65);
 assert.equal(d.rimSkinWidth,2.6);
 assert.equal(d.rimSkinOpacity,0);
 assert.equal(d.rimSkinLightThreshold,.65);
 assert.equal(d.rimSkinWarmth,1);
 const constrained=effectiveStudioLightLab({...d,rimWidth:99,
  rimAngleLooseness:99,rimFabricWidth:-5,rimFabricOpacity:10,
  rimFabricLightThreshold:10,rimSkinWidth:12,rimSkinOpacity:10,
  rimSkinLightThreshold:-1,rimSkinWarmth:50});
 assert.equal(constrained.rimWidth,4);
 assert.equal(constrained.rimAngleLooseness,2);
 assert.equal(constrained.rimFabricWidth,1);
 assert.equal(constrained.rimFabricOpacity,0);
 assert.equal(constrained.rimFabricLightThreshold,1);
 assert.equal(constrained.rimSkinWidth,4);
 assert.equal(constrained.rimSkinOpacity,0);
 assert.equal(constrained.rimSkinLightThreshold,0);
 assert.equal(constrained.rimSkinWarmth,1.5);
 assert.deepEqual(effectiveStudioLightLab(constrained,true),d);
 const grid=read('src/operator-appearance-grid.ts');
 assert.match(grid,/previous\.rimFabricWidth===settings\.rimFabricWidth/);
 assert.match(grid,/previous\.rimSkinWarmth===settings\.rimSkinWarmth/);
 const arsenal=read('src/arsenal/lighting-lab.ts');
 assert.match(arsenal,/3-band graphic \+ highlight/);
 assert.match(arsenal,/APPROVED_GRAPHIC_LIGHTING/);
 assert.doesNotMatch(arsenal,/GEAR EDGE WIDTH|SKIN WARMTH/);
});
test('R7.15 soft equipment is included without turning lenses into outlines',()=>{
 const rig=read('src/breach-operator-rig.ts');
 const head=read('src/operator-wardrobe-head-visuals.ts');
 const gear=read('src/operator-wardrobe-gear-visuals.ts');
 const kit=read('src/operator-visual-kit.ts');
 assert.match(rig,/headArmor\.userData\.fieldworkStudioSoftGear=true/);
 assert.doesNotMatch(rig,/headCloth,headArmor\]/);
 assert.match(head,/fieldworkStudioSoftGear=true/);
 assert.match(gear,/armorFabric,gearFabric,packFabric,trim/);
 assert.match(kit,/\[trim,seam,patchMaterial\]/);
 const material=read('src/operator-studio-graphic-lighting.ts');
 assert.match(material,/fwLitBand/);
 assert.match(material,/fieldworkRimStrength/);
 assert.doesNotMatch(material,/fwSoftBand|fwSkinTint|fwSoftLightPeak|fieldworkRimFabric/);
 assert.doesNotMatch(material,/applyStudioEdgeBleed|clearStudioEdgeBleed|disposeStudioEdgeBleed/);
 assert.doesNotMatch(material,/gl_Position=projectionMatrix\*view/);
 assert.doesNotMatch(material,/localStorage|sessionStorage/);
});

test('R7.18 shared look reaches Arsenal/live, without tactical shadow-size changes',()=>{
 const live=read('src/breach-3d.ts');
 const arsenal=read('src/arsenal/viewport.ts');
 const world=read('src/breach-graphic-world-lighting.ts');
 const studio=read('src/operator-studio-graphic-lighting.ts');
 assert.match(live,/applyStudioGraphicLighting\(object\.root,APPROVED_GRAPHIC_LIGHTING\)/);
 assert.match(live,/applyWorldGraphicLighting\(this\.root\)/);
 assert.match(live,/this\.quality\.shadowSize/);
 assert.doesNotMatch(live,/studioShadowSize|studioShadowSizeOverride/);
 assert.match(arsenal,/APPROVED_GRAPHIC_LIGHTING/);
 assert.match(arsenal,/STUDIO_INSPECTION_LIGHT/);
 assert.match(arsenal,/studioShadowPalette/);
 assert.match(studio,/fieldworkCelHighlightTone/);
 assert.match(studio,/vec3\(\.975,\.926,\.941\)/);
 assert.match(world,/r718-world-3-band-rose/);
 assert.doesNotMatch(world,/new THREE\.Mesh|new THREE\.WebGLRenderTarget/);
});
