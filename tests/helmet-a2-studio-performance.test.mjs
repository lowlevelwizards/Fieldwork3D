import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
const smoke=readFileSync(new URL('../scripts/smoke-operator-studio.mjs',import.meta.url),'utf8');
test('A2-D helmet controls defer hidden item-card GPU work',()=>{
 assert.match(source,/helmetThumbnailsDeferred='true'/);
 assert.match(source,/helmetThumbnailsDeferred==='true'/);
 assert.match(source,/helmetDetailsOnly:true/);
 assert.match(source,/if\(!lightweight\|\|activeStep==='items'\)/);
 assert.match(smoke,/Saved-inactive light cannot be cleared/);
 assert.match(smoke,/Hidden headwear thumbnails rerendered during detail changes/);
});
test('A2-D details edits preserve the user workflow and expanded guidance',()=>{
 assert.match(source,/expandedHelmetHelp\.has\(title\)/);
 assert.match(source,/expandedHelmetHelp\.add\(title\)/);
 assert.match(source,/expandedHelmetHelp\.delete\(title\)/);
 assert.match(source,/activeStep=savedStep/);
 assert.match(source,/sheet\.scrollTop=savedScroll/);
});
test('A2-D refresh bypasses unrelated controls and references for helmet detail changes',()=>{
 assert.match(source,/if\(!lightweight\)renderCategories\(\)/);
 assert.match(source,/if\(!lightweight\)\{\s*renderPresetMenu\(\);\s*referenceBrowser\.refresh\(readOnly\)/);
});
