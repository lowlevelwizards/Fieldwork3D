import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=file('operator-studio.html');
const studio=file('src/operator-studio.ts');
const css=file('src/operator-studio.css');

test('Studio workflow keeps six category groups and adds three clear editing steps',()=>{
 for(const [step,title] of [['items','ITEM'],['materials','MATERIAL'],['details','DETAILS']]){
  assert.match(html,new RegExp('data-studio-step="'+step+'".*'+title));
 }
 assert.match(html,/id="studioItemBrowser"/);
 assert.match(html,/id="studioMaterials"[^>]+hidden/);
 assert.match(studio,/type StudioStep='items'\|'materials'\|'details'/);
 assert.match(studio,/function applyStudioStep\(\)/);
 assert.match(studio,/itemRoot\.hidden=activeStep!=='items'/);
 assert.match(studio,/materialRoot\.hidden=activeStep==='items'/);
 assert.match(studio,/child\.hidden=!show/);
 assert.match(studio,/function selectCategory\(slot:WardrobeSlot\)\{\s*activeCategory=slot;activeStep='items';/);
 assert.match(studio,/activeStep='materials';\s*changeWardrobe\(setWardrobeStyle/);
 assert.match(studio,/selected=modelSelector\.value;activeStep='items'/);
 assert.match(css,/#studioItemBrowser\[hidden\],#studioMaterials\[hidden\]/);
});
test('material step is focused but remains a direct nonmandatory tap away',()=>{
 assert.match(studio,/for\(const button of workflowButtons\)button\.addEventListener\('click'/);
 assert.match(studio,/MATERIAL_LABELS\.test\(label\)\?'materials':'details'/);
 assert.match(studio,/applyStudioStep\(\);\s*\}\s*\/\*\* Six primary categories/);
 assert.match(html,/id="studioWorkflowHelp"/);
 assert.match(css,/\.studio-workflow button\[aria-pressed="true"\]/);
 assert.match(css,/\.studio-empty-step\{/);
});
test('camouflage uses a summary and only draws its complete library on demand',()=>{
 assert.match(studio,/const picker=document\.createElement\('details'\);picker\.className='studio-camo-picker'/);
 assert.match(studio,/picker\.open=openCamoLibraries\.has\(context\)/);
 assert.match(studio,/const summary=document\.createElement\('summary'\);summary\.className='studio-camo-selected'/);
 assert.match(studio,/if\(active\)paintCamoPreview\(currentSwatch,active\)/);
 assert.match(studio,/change\.textContent='CHANGE'/);
 assert.match(studio,/if\(!picker\.open\)return;/);
 assert.match(studio,/const ordered=browseCamos\(ids,\{state,active,reference,prefs\}\)/);
 assert.match(studio,/recordCamoRecent\(id\);choose\(id\)/);
 assert.match(studio,/createCamoFavoriteButton\(id,prefs\.favorites\.includes\(id\)/);
 assert.match(css,/\.studio-camo-selected canvas\{/);
 assert.match(css,/\.studio-camo-library\{/);
 assert.match(css,/image-rendering:pixelated/);
});
test('R2 preserves save, compare and equipment-versus-appearance authority',()=>{
 for(const id of ['studioApply','studioCompare','studioUndo','studioPresetSave',
   'studioMatchSet','studioReset','studioGearToggle','studioCanvas'])
  assert.ok(html.includes('id="'+id+'"'),id+' control absent');
 assert.match(studio,/applyStudioRosterEdits/);
 assert.match(studio,/applyStudioCampaignEdits/);
 assert.match(studio,/saveInFlight/);
 assert.match(studio,/setWardrobeFabricCamo/);
 assert.match(studio,/setWardrobeFabricSolid/);
 assert.match(studio,/headwearCamoChoices/);
 assert.match(studio,/setEquipmentChoice/);
});
