import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWardrobe,readWardrobe} from '../src/operator-wardrobe-data.ts';
import {initialEquipmentLoadout} from '../src/equipment-loadouts.ts';
import {makeWardrobeLook,exportWardrobeLook,importWardrobeLook}
 from '../src/operator-wardrobe-storage.ts';
import {initialRoster,freshQuickPlayRoster,serializeQuickPlayCosmetics,readRoster}
 from '../src/breach-roster.ts';
import {headwearAppearanceModel,selectHeadwearSolid,selectHeadwearCamo,
 rerollHeadwearCamo} from '../src/operator-headwear-picker.ts';
import {headwearCamoChoices} from '../src/operator-headwear-camo.ts';

test('headgear picker respects material eligibility without touching kit or palette',()=>{
 const initial={...initialWardrobe(),palette:7};
 const blocked=selectHeadwearCamo(initial,'soviet-steel','m81-woodland');
 assert.equal(blocked,initial,'painted steel cannot receive a cloth camouflage');
 assert.equal(headwearAppearanceModel('high-cut-rails'),'high-cut');
 assert.ok(headwearCamoChoices('ach').includes('m81-woodland'));
 const solid=selectHeadwearSolid(initial,'ach','black');
 assert.equal(solid.headwearColor,'black');
 assert.equal(solid.headwearCamo,undefined);
 assert.equal(solid.palette,7);
 assert.equal(selectHeadwearSolid(solid,'ach','soviet-4bo'),solid);
 const applied=selectHeadwearCamo(solid,'ach','m81-woodland');
 assert.equal(applied.headwearCamo,'m81-woodland');
 assert.equal(applied.headwearCamoRoll,0);
 assert.equal(applied.palette,7);
 const rerolled=selectHeadwearCamo(applied,'ach','m81-woodland');
 assert.equal(rerolled.headwearCamoRoll,1);
 assert.equal(rerollHeadwearCamo(rerolled,'ach').headwearCamoRoll,2);
 assert.equal(rerollHeadwearCamo(rerolled,'soviet-steel'),rerolled);
 assert.equal(readWardrobe(rerolled).headwearCamoRoll,1);
 assert.equal(readWardrobe(rerolled).headwearColor,'black');
});

test('approved headwear identity survives saved outfits and Quick Play reset',()=>{
 const wardrobe=selectHeadwearCamo({...initialWardrobe(),palette:5},
  'ach','m81-woodland');
 const look=makeWardrobeLook('Rook M81',initialEquipmentLoadout(),wardrobe);
 const imported=importWardrobeLook(exportWardrobeLook(look));
 assert.equal(imported.wardrobe.headwearCamo,'m81-woodland');
 assert.equal(imported.wardrobe.palette,5);
 let roster=initialRoster();
 roster.members[0].wardrobe=readWardrobe(wardrobe);
 roster.members[0].reserve=0;roster.members[0].injuries=2;
 roster=freshQuickPlayRoster(roster);
 assert.equal(roster.members[0].wardrobe.headwearCamo,'m81-woodland');
 assert.equal(roster.members[0].wardrobe.palette,5);
 assert.equal(roster.members[0].injuries,0);
 assert.ok(roster.members[0].reserve>0);
 const restored=readRoster(serializeQuickPlayCosmetics(roster));
 assert.equal(restored.members[0].wardrobe.headwearCamo,'m81-woodland');
});

test('both game editors expose one shared approved swatch UI without inventory grants',()=>{
 const campaign=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 const quick=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const picker=readFileSync(new URL('../src/operator-headwear-picker.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/operator-headwear-picker.css',import.meta.url),'utf8');
 assert.match(campaign,/createHeadwearAppearancePicker\(person\.loadout,wardrobe/);
 assert.match(quick,/createHeadwearAppearancePicker\(member\.loadout/);
 assert.match(picker,/headwearCamoPixels\(id\)/);
 assert.match(picker,/headwearColorChoices\(canon\)/);
 assert.match(picker,/headwearCamoChoices\(model\)/);
 assert.match(picker,/nextHeadwearCamoRoll/);
 assert.match(picker,/options\.disabled/);
 assert.match(quick,/expandedQuickWardrobe=member\.id/);
 assert.match(css,/min-height:44px/);
 assert.doesNotMatch(picker,/setEquipmentChoice|equipCampaignGear|equipRosterGear/);
});

test('Lab restores saved palette, exposes one-step undo and never hides all bare hair',()=>{
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 const kit=readFileSync(new URL('../src/operator-visual-kit.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 assert.match(html,/id="wardrobeUndo"/);
 assert.match(lab,/function checkpointAppearance\(/);
 assert.match(lab,/function undoAppearance\(/);
 assert.match(lab,/wardrobeUndoButton\.addEventListener\('click',undoAppearance\)/);
 assert.match(lab,/wardrobeOptions=restore\.wardrobe/);
 assert.doesNotMatch(lab,/labPalette=1;wardrobeOptions=\{\.\.\.wardrobeOptions,palette:0\}/);
 assert.match(kit,/v\.hair\.visible=looks\.headwear==='bare'/);
 assert.doesNotMatch(lab,/rig\.visualKit\.hair\.visible=false/);
});
