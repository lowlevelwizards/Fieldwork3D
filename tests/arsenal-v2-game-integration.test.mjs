import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Campaign and Quick Play both reach the same unified Workbench through the A6 bridge',()=>{
 const main=src('src/breach-main.ts'),
  bridge=src('src/breach-equipment-editor-bridge.ts'),
  operations=src('src/breach-operations-board-controller.ts'),
  ui=src('src/campaign-ui.ts');
 // The A6 entrypoint only composes a shared permission/persistence owner.
 assert.match(main,/createBreachEquipmentEditorBridge\(/);
 assert.match(main,/openQuickArsenal=equipmentEditor\.openQuickArsenal/);
 assert.match(main,/openCampaignArsenal=equipmentEditor\.openCampaignArsenal/);
 assert.match(bridge,/async function openCampaignArsenal\(/);
 assert.match(bridge,/async function openQuickArsenal\(/);
 assert.match(bridge,/import\('\.\/arsenal\/workbench-screen\.ts'\)/);
 assert.match(bridge,/commitCampaignArsenalEdit/);
 assert.match(bridge,/applyQuickPlayArsenalEdit/);
 assert.match(ui,/OPEN ARSENAL/);
 assert.match(operations,/OPEN ARSENAL · FULL WORKBENCH/);
 assert.match(main,/openArsenal:id=>\{void openCampaignArsenal\(id\);/);
 assert.match(main,/openArsenal:id=>\{void openQuickArsenal\(id\);/);
});

test('Both Workbench entrypoints preserve authorization, rollback, and legacy fallback',()=>{
 const main=src('src/breach-main.ts');
 const bridge=src('src/breach-equipment-editor-bridge.ts');
 assert.match(main,/createBreachEquipmentEditorBridge\(/);
 assert.match(bridge,/config\.getCampaign\(\)\?\.activeContractId/);
 assert.match(bridge,/current\.activeContractId\|\|!member/);
 assert.match(bridge,/config\.getSession\(\)\.phase!=='planning'/);
 assert.match(bridge,/config\.isReplaying\(\)/);
 assert.match(bridge,/config\.getMode\(\)!=='quick'/);
 assert.match(bridge,/if\(!config\.saveCampaign\(\)\)/);
 assert.match(bridge,/config\.setCampaign\(before\)/);
 assert.match(bridge,/EXISTING ARMORY STILL WORKS/);
 assert.match(bridge,/EXISTING LOADOUT EDITOR STILL WORKS/);
});
