import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioLightLabFromQuery,effectiveStudioLightLab,
 DEFAULT_STUDIO_LIGHT_LAB,studioLightLabLabel}
 from '../src/operator-studio-light-lab.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('R7.10 original remains default with transient preview-only settings',()=>{
 assert.deepEqual(studioLightLabFromQuery(''),DEFAULT_STUDIO_LIGHT_LAB);
 assert.equal(studioLightLabLabel(DEFAULT_STUDIO_LIGHT_LAB),'ORIGINAL');
 assert.deepEqual(effectiveStudioLightLab(DEFAULT_STUDIO_LIGHT_LAB),
  DEFAULT_STUDIO_LIGHT_LAB);
});
test('R7.10 previous art links normalize into the actual compact selections',()=>{
 const state=studioLightLabFromQuery(
  '?operatorLightingToon=3&operatorRim=pixel&operatorGradient=violet-noir&operatorShadowColor=steel');
 assert.equal(state.toon,2);
 assert.equal(state.rim,'dual');
 assert.equal(state.gradient,'piece');
 assert.equal(state.shadow,'plum-plus');
 assert.equal(state.celProfile,'graphic');
 assert.equal(state.celLow,.70);
 assert.equal(state.rimAmount,.80);
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
 assert.equal(studioLightLabFromQuery('?operatorRimAmount=not-a-number').rimAmount,.80);
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
 assert.match(html,/2-band · very graphic/);
 assert.match(html,/Each item · soft grayscale/);
 assert.match(html,/Each item · dusty gray-rose/);
 assert.match(html,/Material glints/);
 assert.match(html,/RIM OPACITY/);
 assert.match(html,/id="studioRimAmount"[^>]*max="1"[^>]*value="0.80"/);
 assert.match(html,/Saturated plum/);
 assert.match(html,/PREVIEW WITH WEAPON/);
 for(const id of ['studioRimWidth','studioRimCoverage','studioRimFabric',
  'studioRimSkin','studioLightAzimuth','studioRimMask'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/OPEN 3D ARSENAL LIGHTING LAB/);
 const ts=read('src/operator-studio.ts');
 assert.match(ts,/labCelLowWrap\.hidden=!celOn/);
 assert.match(ts,/labRimAmountWrap\.hidden=!rimOn/);
 assert.match(ts,/addEventListener\('input',readSlider\)/);
 assert.match(ts,/addEventListener\('change',readSlider\)/);
 assert.match(ts,/lightLabCompareOriginal=!lightLabCompareOriginal/);
 assert.match(ts,/lightLabSettings=\{\.\.\.DEFAULT_STUDIO_LIGHT_LAB\}/);
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
