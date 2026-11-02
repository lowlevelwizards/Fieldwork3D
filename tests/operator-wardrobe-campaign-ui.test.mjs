import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('campaign wardrobe stays cosmetic while the actual armory controls stock',()=>{
 const ui=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(ui,/WARDROBE \/ APPEARANCE/);
 assert.match(ui,/option\.disabled=resolvedWardrobe\(candidate,person\.loadout\)/);
 assert.match(ui,/this\.handlers\.setWardrobe/);
 assert.match(ui,/person\.magazines,person\.wardrobe/);
 assert.match(main,/setCampaignWardrobe\(campaign,id,look\)/);
});
