import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('front menu opens Operator Studio without creating a mission',()=>{
 const ui=read('src/campaign-ui.ts');
 const flow=read('src/breach-campaign-flow.ts');
 const main=read('src/breach-main.ts');
 const entry=ui.slice(ui.indexOf(' entry(hasSave:boolean){'),
  ui.indexOf(' home(c:CampaignState){'));
 assert.match(entry,/OPERATOR STUDIO',this\.handlers\.openMenuStudio/);
 assert.match(flow,/openMenuStudio:\(\)=>config\.openMenuStudio\(\)/);
 assert.match(main,/openMenuStudio:\(\)=>openOperatorStudio\(persistentRoster\.members\[0\]\?\.id,'quick'\)/);
 const menuAction=main.match(/openMenuStudio:\(\)=>([^\n]+)/)?.[1]??'';
 assert.doesNotMatch(menuAction,/launchQuickPlay|reset\(|create\(|generate/);
});

test('menu appearance saving does not inherit a completed mission phase',()=>{
 const bridge=read('src/operator-studio-bridge.ts');
 assert.match(bridge,/const canEditQuickAppearance=\(\)=>!config\.isReplaying\(\)/);
 assert.match(bridge,/config\.getMode\(\)==='menu'/);
 assert.match(bridge,/config\.getSession\(\)\.phase==='planning'/);
 assert.match(bridge,/studioMode==='quick'&&canEditQuickAppearance\(\)/);
 assert.match(bridge,/ok&&config\.getMode\(\)==='quick'/);
});

test('selecting a style stays in ITEM until user explicitly chooses MATERIAL',()=>{
 const studio=read('src/operator-studio.ts');
 const choose=studio.slice(studio.indexOf('function chooseStyle('),
  studio.indexOf('function undo(){'));
 assert.match(choose,/changeWardrobe\(setWardrobeStyle\(current\(\),slot,id\)\)/);
 assert.doesNotMatch(choose,/activeStep='materials'/);
 assert.match(studio,/setStudioStep\(button\.dataset\.studioStep as StudioStep\)/);
});

test('experimental lighting controls are hidden without removing approved rendering',()=>{
 const html=read('operator-studio.html');
 const css=read('src/operator-studio.css');
 const studio=read('src/operator-studio.ts');
 assert.match(html,/<details id="studioLightLab" class="studio-light-lab" hidden>/);
 assert.match(css,/\.studio-light-lab\[hidden\]\{display:none!important\}/);
 assert.match(studio,/studioLighting\.setShadowColor\(live\.shadow\)/);
});
