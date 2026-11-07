import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioLightLabFromQuery,effectiveStudioLightLab,
 DEFAULT_STUDIO_LIGHT_LAB,studioLightLabLabel}
 from '../src/operator-studio-light-lab.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('R7.8/R7.9 normal Studio still starts with the original visual style',()=>{
 assert.deepEqual(studioLightLabFromQuery(''),DEFAULT_STUDIO_LIGHT_LAB);
 assert.equal(studioLightLabLabel(DEFAULT_STUDIO_LIGHT_LAB),'ORIGINAL');
 assert.deepEqual(effectiveStudioLightLab(DEFAULT_STUDIO_LIGHT_LAB),
  DEFAULT_STUDIO_LIGHT_LAB);
});
test('R7.8 old direct experimental links initialize extended live controls',()=>{
 const state=studioLightLabFromQuery(
  '?operatorLightingToon=3&operatorRim=pixel&operatorGradient=sculptural&operatorShadowColor=steel');
 assert.equal(state.toon,3);
 assert.equal(state.rim,'pixel');
 assert.equal(state.gradient,'sculptural');
 assert.equal(state.shadow,'steel');
 assert.equal(state.celProfile,'classic');
 assert.equal(state.allSurfaces,true);
 assert.deepEqual(effectiveStudioLightLab(state,true),DEFAULT_STUDIO_LIGHT_LAB);
 assert.deepEqual(effectiveStudioLightLab(state,false),state,
  'comparison must not erase selected cutoffs, colors or rim');
 assert.equal(effectiveStudioLightLab({...state,toon:0}).rim,'off',
  'legacy pixel rim requires cel; dual graphic rim may be independent');
});
test('R7.9 expanded Studio controls preserve the existing appearance editor',()=>{
 const html=read('operator-studio.html');
 for(const id of ['studioLightLab','studioLightCel','studioLightRim',
  'studioLightGradient','studioLightShadow','studioLightCompare',
  'studioLightReset','studioLightLabStatus','studioCelProfile',
  'studioCelLow','studioCelHigh','studioLightScope',
  'studioLightShowWeapon'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<details id="studioLightLab"/);
 assert.match(html,/LIVE 3D COMPARISON/);
 assert.match(html,/PREVIEW WITH WEAPON/);
 const ts=read('src/operator-studio.ts');
 assert.match(ts,/for\(const input of \[labCel,labRim,labGradient,labShadow/);
 assert.match(ts,/lightLabCompareOriginal=!lightLabCompareOriginal/);
 assert.match(ts,/lightLabSettings=\{\.\.\.DEFAULT_STUDIO_LIGHT_LAB\}/);
 assert.match(ts,/studioLighting\.setShadowColor\(live\.shadow\)/);
 assert.match(ts,/thumbBrowser\.setLightingSettings\(live\)/);
 assert.match(ts,/applyStudioGraphicLighting\(rig\.root,light\)/);
 assert.match(ts,/restoreStudioGraphicLighting\(rig\.root\)/);
 assert.match(ts,/applyOperatorHeightLighting\(rig\.root,/);
});
test('R7.9 lighting choices remain preview-only, never campaign/roster writes',()=>{
 const ts=read('src/operator-studio.ts');
 const settings=read('src/operator-studio-light-lab.ts');
 assert.match(settings,/Never|never written to wardrobe|Nothing here is persisted/);
 assert.match(ts,/window\.parent\.postMessage\(\{type:'fw-studio-commit-batch',entries\}/);
 assert.doesNotMatch(settings,/localStorage|sessionStorage/);
 const grid=read('src/operator-appearance-grid.ts');
 assert.match(grid,/setLightingSettings\(settings:StudioLightLabSettings\)/);
 assert.match(grid,/this\.lighting\.setShadowColor\(settings\.shadow\)/);
 assert.match(grid,/this\.cache\.clear\(\)/);
 assert.match(grid,/for\(const card of this\.cards\.values\(\)\)card\.readyKey=''/);
 assert.match(grid,/this\.paint\(\)/);
 assert.match(grid,/light\.toon/);
 assert.match(grid,/this\.lightingSettings\.gradient/);
});
