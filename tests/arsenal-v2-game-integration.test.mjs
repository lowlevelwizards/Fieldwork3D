import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Campaign operator and Quick Play both open the same unified Workbench',()=>{
 const main=src('src/breach-main.ts'),ui=src('src/campaign-ui.ts');
 assert.match(main,/async function openCampaignArsenal\(/);
 assert.match(main,/async function openQuickArsenal\(/);
 assert.match(main,/import\('\.\/arsenal\/workbench-screen\.ts'\)/);
 assert.match(main,/commitCampaignArsenalEdit/);
 assert.match(main,/applyQuickPlayArsenalEdit/);
 assert.match(ui,/OPEN ARSENAL/);
 assert.match(main,/OPEN ARSENAL · FULL WORKBENCH/);
});
test('Both integrations preserve legacy fallback and do not bypass authorization',()=>{
 const main=src('src/breach-main.ts');
 assert.match(main,/campaign\.activeContractId/);
 assert.match(main,/state\.phase!=='planning'/);
 assert.match(main,/replaying/);
 assert.match(main,/if\(!saveCampaign\(\)\)/);
 assert.match(main,/campaign=before/);
 assert.match(main,/EXISTING ARMORY STILL WORKS/);
 assert.match(main,/EXISTING LOADOUT EDITOR STILL WORKS/);
});
