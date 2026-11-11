import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/breach-main.ts');
const flow=read('src/breach-campaign-flow.ts');
const landing=read('src/campaign-ui.ts');
const loader=read('src/breach-quickplay-controller.ts');
const creator=read('src/ui/quick-play-configurator.ts');
const screens=read('src/ui/breach-mission-screens.ts');
const html=read('index.html');

test('primary Quick Play entry opens the creator, not an immediate worker job',()=>{
 assert.match(landing,/button\('QUICK PLAY',this\.handlers\.quickPlay/);
 assert.doesNotMatch(landing,/CUSTOMIZE QUICK PLAY/);
 assert.match(flow,/quickPlay:\(\)=>\{void config\.launchQuickPlay\(\);\}/);
 assert.match(main,/const launchQuickPlay=\(\)=>quickPlayController\.customize\(\)/);
 assert.match(loader,/customize:\(\)=>\{if\(!quickPlayBusy\)configurator\.open\(\);\}/);
 assert.match(creator,/onGenerate:.*QuickPlaySettings/);
});

test('in-mission creator is a reversible overlay; NEXT and NEW SITE use it',()=>{
 assert.match(html,/id="quickPlaySetup"[^>]*>MISSION SETUP/);
 assert.match(main,/ui\.quickPlaySetup\.hidden=appFlow.mode!=='quick'\|\|replaying/);
 assert.match(main,/ui\.quickPlaySetup\.addEventListener\('click',returnToQuickPlayGenerator\)/);
 assert.match(main,/function returnToQuickPlayGenerator\(\)\{[\s\S]*?closeMissionSettings\(false\);[\s\S]*?quickPlayController\.customize\(\);/);
 assert.match(main,/if\(appFlow.mode==='quick'\)\{returnToQuickPlayGenerator\(\);return;\}/);
 assert.match(main,/ui\.next\.addEventListener\('click',[\s\S]*?if\(appFlow.mode==='quick'\)returnToQuickPlayGenerator\(\)/);
 assert.match(screens,/ui\.variant\.textContent=quickPlay\?'MISSION SETUP':'NEW SITE'/);
 assert.match(screens,/ui\.siteSize\.hidden=quickPlay/);
});

test('live mission simulation and game shortcuts stop under the overlay',()=>{
 assert.match(creator,/get isOpen\(\)\{return !backdrop\.hidden;\}/);
 assert.match(loader,/get configuring\(\)\{return configurator\.isOpen;\}/);
 assert.match(main,/isQuickPlayBusy:\(\)=>quickPlayController\.busy\|\|quickPlayController\.configuring/);
 assert.match(main,/quickPlayController\.configuring\)return;/);
 assert.match(creator,/function hide\(\)\{[\s\S]*?backdrop\.hidden=true;/);
 // Existing session replacement still happens only after the generator worker
 // reports completion, never as part of opening the settings dialog.
 assert.ok(loader.indexOf("const generated=await new Promise")<
  loader.indexOf("config.startSession(seed,generated.site,recipe.mission)"));
});

test('cancel or startup failure returns to the creator without a menu reset',()=>{
 assert.match(loader,/Quick Play loading cancelled/);
 assert.match(loader,/quickPlayPanel\.hidden=true;\s*\/\/ Cancel returns[\s\S]*?configurator\.open\(\)/);
 assert.match(loader,/quickPlayPanel\.dataset\.state==='error'\)\{\s*quickPlayPanel\.hidden=true;\s*configurator\.open\(\)/);
 assert.match(loader,/Stopped · return to scenario generator/);
 assert.match(main,/if\(appFlow.mode==='quick'\)returnToQuickPlayGenerator\(\);[\s\S]*?else reset\(\);/);
});
