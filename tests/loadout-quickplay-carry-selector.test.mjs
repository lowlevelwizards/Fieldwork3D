import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

test('Quick Play uses Campaign Outfitter gallery with one roster authority',()=>{
 const config=read('ui/quick-play-configurator.ts');
 const gallery=read('ui/campaign-outfitter-gallery.ts');
 assert.match(config,/equipmentWorkspace\.mountGallery\(selected\.id,\{/);
 assert.match(config,/catalogOutfitterSources\(selected\.loadout\)/);
 assert.doesNotMatch(config,/sources=new Map<LoadoutSlot,HTMLSelectElement>/);
 assert.match(config,/onEquipCarryGear\?\.\(selected\.id,slot,itemId\)/);
 assert.match(config,/onEquipGear\?\.\(selected\.id,slot,itemId\)/);
 assert.match(config,/onEquipWeapon\?\.\(selected\.id,/);
 assert.match(config,/renderGadgets\(options\.getRoster/);
 assert.doesNotMatch(config,/attachCarryGearChangePreview\(/);
 assert.match(gallery,/option\.disabled/);
 assert.match(gallery,/ReadonlyMap<LoadoutSlot,OutfitterChoiceSource>/);
 assert.match(gallery,/tile\.disabled=!choice\.issued/);
 assert.match(gallery,/result\.filter\(choice=>choice\.issued\)\.concat/);
 assert.doesNotMatch(gallery,/base\.push\(\.\.\.magazineChoices/);
 assert.doesNotMatch(gallery,/base\.push\(\.\.\.carryChoices/);
 assert.match(read('breach-quickplay-controller.ts'),/onEquipCarryGear:config\.equipCarryGear/);
 assert.match(read('breach-quickplay-controller.ts'),/onEquipGear:config\.equipGear/);
 assert.match(read('breach-main.ts'),/equipRosterCarryGear\(persistentRoster,id,slot,itemId\)/);
 assert.match(read('breach-main.ts'),/equipRosterGear\(persistentRoster,id,slot,itemId\)/);
});
