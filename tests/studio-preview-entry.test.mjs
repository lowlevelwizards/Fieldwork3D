import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Studio preview is opt-in and retains existing entry points',()=>{
 const vite=read('vite.config.ts'),html=read('studio-preview.html');
 assert.match(vite,/studioPreview: 'studio-preview\.html'/);
 assert.match(vite,/operatorStudio: 'operator-studio\.html'/);
 assert.match(vite,/arsenal: 'arsenal\.html'/);
 assert.match(html,/src\/studio\/entry\.ts/);
 assert.match(html,/TEMPORARY OPERATORS/);
 assert.doesNotMatch(read('index.html'),/studio-preview\.html/);
});
test('Studio preview edits only an initial in-memory roster through existing domain authorities',()=>{
 const source=read('src/studio/entry.ts');
 assert.match(source,/let roster=initialRoster\(\)/);
 assert.match(source,/equipRosterCatalogPreset\(roster,id,itemId\)/);
 assert.match(source,/equipRosterCarryGear\(roster,id,slot,itemId,'unified'\)/);
 assert.match(source,/equipRosterGear\(roster,id,slot,itemId,'unified'\)/);
 assert.match(source,/quoteQuickPlayArsenalEdit\(roster,id,recipe\)/);
 assert.match(source,/applyQuickPlayArsenalEdit\(roster,id,recipe\)/);
 assert.match(source,/workspaces:\{operators:equipment,arsenal\}/);
 assert.doesNotMatch(source,/localStorage|sessionStorage|saveRoster|setCampaign|readRoster/);
 assert.doesNotMatch(source,/onAdvanced:/);
});
test('Unsupported advanced carry control is not exposed without an authorized host callback',()=>{
 assert.match(read('src/studio/operator-equipment.ts'),/onAdvanced:ports\.onAdvanced\?/);
 assert.match(read('src/ui/equipment-workspace.ts'),/onAdvanced:options\.onAdvanced\?/);
 assert.match(read('src/ui/campaign-outfitter-gallery.ts'),/if\(options\.onAdvanced&&/);
});
