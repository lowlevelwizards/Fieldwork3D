import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {selectOperatorLoadout} from '../scripts/verification/ci-operator-loadout-routing.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('one canonical outfitter browser gate retains camera, placement and mobile acceptance',()=>{
 const action=read('.github/actions/outfitter-mobile-smoke/action.yml');
 assert.match(action,/using: composite/);
 assert.match(action,/npx playwright install --with-deps chromium/);
 assert.match(action,/node scripts\/smoke-loadout-bench-r1\.mjs/);
 const w=read('.github/workflows/loadout-ux-r1-critical.yml');
 assert.match(w,/uses: \.\/\.github\/actions\/outfitter-mobile-smoke/);
 assert.match(w,/npm run check/);
 assert.match(w,/npm run build/);
 assert.equal((w.match(/uses: \.\/\.github\/actions\/outfitter-mobile-smoke/g)||[]).length,1);
 for(const path of ["tests/consolidation-p8-outfitter-zones.test.mjs","tests/equipment-field-inventory.test.mjs","tests/equipment-field-transfer.test.mjs","tests/equipment-physical-board.test.mjs","tests/equipment-magazine-transfer.test.mjs","tests/loadout-magazine-editor-integration.test.mjs","tests/equipment-visual-inspection.test.mjs","tests/consolidation-4-to-7-integration.test.mjs","tests/loadout-quickplay-carry-selector.test.mjs","tests/loadout-quickplay-preview-integration.test.mjs","tests/outfitter-gallery-lifecycle.test.mjs","tests/equipment-thumbnail-camera.test.mjs"]) assert.ok(w.includes(path),path);
 for(const path of ["src/campaign-ui.ts","src/campaign-style.css","src/ui/field-gadget-editor.ts","src/ui/campaign-outfitter-gallery.ts","src/ui/outfitter-choice-sources.ts","src/ui/outfitter-zone-nav.ts","src/ui/quick-play-configurator.ts","src/breach-operations-board-controller.ts","tests/consolidation-p8-outfitter-zones.test.mjs","src/ui/loadout-prep.css",".github/actions/outfitter-mobile-smoke/action.yml",".github/workflows/loadout-ux-r1-critical.yml","src/equipment-preview.ts","src/ui/campaign-gear-picker.ts","src/equipment-thumbnail-camera.ts","tests/equipment-thumbnail-camera.test.mjs","scripts/smoke-loadout-bench-r1.mjs","tests/equipment-visual-inspection.test.mjs","tests/equipment-physical-board.test.mjs","tests/equipment-field-transfer.test.mjs"]) assert.ok(selectOperatorLoadout([path])['loadout-ux-r1-critical'],path);
 for(const path of [".github/workflows/visual-armory-v1-critical.yml",".github/workflows/visual-armory-v2-critical.yml","scripts/smoke-loadout-ux-r1.mjs","scripts/smoke-visual-armory-v1.mjs","scripts/smoke-visual-armory-v2.mjs"]) assert.equal(existsSync(new URL('../'+path,import.meta.url)),false,path);
});
