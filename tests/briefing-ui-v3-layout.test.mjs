import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

const html=read('index.html'),css=read('src/breach-style.css'),
 main=read('src/breach-main.ts'),screens=read('src/ui/breach-mission-screens.ts');
test('UI2-3: one card with no-scroll overview and non-overlapping footer',()=>{
 assert.match(html,/id="briefingOverview"/);
 assert.match(html,/id="briefingIntelView" hidden/);
 assert.match(html,/id="briefingPrimary"/);
 assert.match(html,/id="briefingSteps"/);
 assert.match(html,/class="fw-brief-v3-footer"/);
 assert.match(css,/#briefingPanel\.fw-mission-dossier\{[\s\S]*?display:grid;grid-template-rows:auto minmax\(0,1fr\) auto/);
 assert.match(css,/\.fw-brief-v3-footer\{[\s\S]*?display:grid/);
 assert.match(css,/\.fw-brief-v3-overview\{[^}]*overflow-y:auto/);
 assert.match(css,/@media\(max-height:740px\)/);
 assert.match(css,/@media\(max-height:560px\) and \(orientation:landscape\)/);
 assert.doesNotMatch(html,/fw-dossier-grid/);
});
test('UI4-7: optional intel uses explicit tabs and authoritative mission contract',()=>{
 for(const id of ['briefingBody','briefingCondition','briefingExtraction',
   'briefingSite','briefingRoster','briefingIntel','briefingClose',
   'briefingIntelToggle','briefingEntryControls'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const tab of ['threat','site','case','contract'])
  assert.ok(html.includes('data-briefing-tab="'+tab+'"'));
 assert.match(screens,/setBriefingView\('brief'\);\s+config\.refreshHud\(\)/);
 assert.match(screens,/ui\.briefingBody\.textContent=brief\.objective/);
 assert.match(screens,/ui\.briefingCondition\.textContent=brief\.condition/);
 assert.match(screens,/ui\.briefingExtraction\.textContent=brief\.extraction/);
 assert.match(main,/ui\.briefingEntryControls\.append\(deploymentButton\)/);
 assert.match(screens,/if\(state===briefingRenderedSession&&dossier===briefingRenderedDossier/);
 assert.match(screens,/tacticalSheetNavigation\.focusFirst\(\)/);
});
test('UI5-6: tactile feedback stays reduced-motion safe and shield stack remains correct',()=>{
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/#briefingPanel\.fw-mission-dossier\{[^}]*z-index:95/);
 assert.match(css,/#briefingPanel\.fw-mission-dossier \.fw-brief-v3-actions button:active/);
 assert.match(html,/id="briefingClose" type="button">PLAN INSERTION/);
});
