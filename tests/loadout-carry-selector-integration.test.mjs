import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('Campaign and both Quick Play entry points use shared carry quote and atomic owners',()=>{
 const ops=read('breach-operations-board-controller.ts');
 const campaign=read('campaign-ui.ts');
 const gallery=read('ui/campaign-outfitter-gallery.ts');
 const config=read('ui/quick-play-configurator.ts');
 const flow=read('breach-campaign-flow.ts');
 assert.match(gallery,/quoteCarryGearChange\(/);
 assert.match(gallery,/tile\.disabled=!choice\.issued/);
 assert.match(ops,/createOutfitterGallery\(\{/);
 assert.match(config,/createOutfitterGallery\(\{/);
 assert.match(ops,/equipRosterCarryGear\(before,member\.id,slot,itemId\)/);
 assert.match(ops,/carryUndo\.record\(member\.id,/);
 assert.match(ops,/captureCarryUndo\(old\.loadout,old\.magazines\)/);
 assert.doesNotMatch(ops,/attachCarryGearChangePreview\(/,
  'Quick Play Squad must not construct another legacy gear picker');
 assert.match(campaign,/attachCarryGearChangePreview\(/);
 assert.match(campaign,/this\.handlers\.equipCarryGear\(id,slot,itemId\)/);
 assert.match(flow,/equipCampaignCarryGear\(c,id,slot,itemId\)/);
});
