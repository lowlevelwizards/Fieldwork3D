import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studioLightLabFromQuery,effectiveStudioLightLab,
 DEFAULT_STUDIO_LIGHT_LAB,studioLightLabLabel}
 from '../src/operator-studio-light-lab.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('R7.8 normal Studio starts with exactly the existing approved appearance',()=>{
 assert.deepEqual(studioLightLabFromQuery(''),DEFAULT_STUDIO_LIGHT_LAB);
 assert.equal(studioLightLabLabel(DEFAULT_STUDIO_LIGHT_LAB),'ORIGINAL');
 assert.deepEqual(effectiveStudioLightLab(DEFAULT_STUDIO_LIGHT_LAB),
  DEFAULT_STUDIO_LIGHT_LAB);
});
test('R7.8 old direct experimental links initialize live controls',()=>{
 const state=studioLightLabFromQuery(
  '?operatorLightingToon=3&operatorRim=pixel&operatorGradient=sculptural&operatorShadowColor=steel');
 assert.deepEqual(state,{toon:3,rim:'pixel',gradient:'sculptural',shadow:'steel'});
 assert.deepEqual(effectiveStudioLightLab(state,true),DEFAULT_STUDIO_LIGHT_LAB);
 assert.deepEqual(effectiveStudioLightLab(state,false),state,
  'exiting comparison must keep the user selected experiment');
 assert.equal(effectiveStudioLightLab({...state,toon:0}).rim,'off',
  'rim requires cel but must not erase a stored rim audition choice');
});
test('R7.8 Studio provides accessible touch controls without replacing appearance editor',()=>{
 const html=read('operator-studio.html');
 for(const id of ['studioLightLab','studioLightCel','studioLightRim',
  'studioLightGradient','studioLightShadow','studioLightCompare',
  'studioLightReset','studioLightLabStatus'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<details id="studioLightLab"/);
 assert.match(html,/LIVE 3D COMPARISON/);
 assert.match(html,/switch off CLOTHES ONLY/);
 const ts=read('src/operator-studio.ts');
 assert.match(ts,/labCel\.addEventListener|for\(const input of \[labCel,labRim,labGradient,labShadow\]\)/);
 assert.match(ts,/lightLabCompareOriginal=!lightLabCompareOriginal/);
 assert.match(ts,/lightLabSettings=\{\.\.\.DEFAULT_STUDIO_LIGHT_LAB\}/);
 assert.match(ts,/studioLighting\.setShadowColor\(live\.shadow\)/);
 assert.match(ts,/thumbBrowser\.setLightingSettings\(live\)/);
 assert.match(ts,/posePreview\(\)/);
 assert.match(ts,/applyOperatorStudioToon\(rig\.root,0\)/);
 assert.match(ts,/applyOperatorHeightLighting\(rig\.root,/);
});
test('R7.8 lighting choices are UI-only; never persisted in roster or loadout',()=>{
 const ts=read('src/operator-studio.ts');
 const settings=read('src/operator-studio-light-lab.ts');
 assert.match(settings,/never written to wardrobe, roster, campaign/);
 assert.match(ts,/window\.parent\.postMessage\(\{type:'fw-studio-commit-batch',entries\}/);
 assert.doesNotMatch(settings,/localStorage|sessionStorage/);
 const grid=read('src/operator-appearance-grid.ts');
 assert.match(grid,/setLightingSettings\(settings:StudioLightLabSettings\)/);
 assert.match(grid,/this\.lighting\.setShadowColor\(settings\.shadow\)/);
 assert.match(grid,/this\.cache\.clear\(\)/);
 assert.match(grid,/for\(const card of this\.cards\.values\(\)\)card\.readyKey=''/);
 assert.match(grid,/this\.paint\(\)/);
 assert.match(grid,/this\.lightingSettings\.toon/);
 assert.match(grid,/this\.lightingSettings\.gradient/);
});
