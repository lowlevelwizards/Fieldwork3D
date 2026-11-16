import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
test('E1.L hot HUD fields keep content and accessibility contracts without identical writes',()=>{
 for(const s of [
  'writeDomText(config.phaseNode,',
  'writeDomText(config.clock,',
  "writeDomAttribute(ui.stance,'aria-pressed'",
  "writeDomAttribute(ui.contact,'aria-pressed'",
  "writeDomAttribute(medicalButton,'aria-label'",
  "writeDomAttribute(fieldLightButton,'aria-pressed'",
  "writeDomText(ui.favoriteMission,",
  "writeDomText(ui.next,",
  'if(canvas.dataset.navBlock!==navBlock)',
  'if(canvas.dataset.planNodes!==planNodes)',
  'if(canvas.dataset.selectedNode!==selectedNodeText)',
  'if(siteHeader)writeDomText(siteHeader,'
 ])assert.ok(hud.includes(s),s);
 assert.match(hud,/if\(e\.side==='red'&&e\.health>0&&isSeen\(state,e\)\)visible\+\+/);
 assert.doesNotMatch(hud,/enemies\(state\)\.filter\(/);
 // Distinct labels and visibility facts still feed the ordinary mission HUD.
 assert.match(hud,/missionText\(state\)/);
 assert.match(hud,/visible\?' • '\+visible\+' CONTACT'/);
});
