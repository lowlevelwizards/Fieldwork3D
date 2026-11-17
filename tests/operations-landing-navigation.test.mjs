import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(name)=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');

test('landing routes the active saved campaign through one primary action',()=>{
 const ui=source('campaign-ui.ts');
 const entry=ui.slice(ui.indexOf(' entry(hasSave:boolean'),
  ui.indexOf(' dispatchCreator(){'));
 assert.match(entry,/available\.find\(\(\[slot\]\)=>slot===active\)/);
 assert.match(entry,/selected\?selected\[3\]/);
 assert.match(entry,/available\.length>1/);
 assert.match(entry,/SWITCH CAMPAIGN/);
 assert.match(entry,/this\.handlers\.continueDispatch/);
 assert.match(entry,/this\.handlers\.continueSandbox/);
 assert.match(entry,/this\.handlers\.continueCampaign/);
 assert.match(entry,/this\.handlers\.newDispatch/);
 assert.match(entry,/this\.handlers\.newSandbox/);
 assert.match(entry,/this\.handlers\.newCampaign/);
 assert.match(entry,/this\.handlers\.quickPlay/);
 assert.match(entry,/this\.handlers\.training/);
 assert.match(entry,/this\.handlers\.openReplayLibrary/);
 assert.match(entry,/this\.handlers\.openMenuStudio/);
 assert.match(entry,/DATA & SAVES/);
 assert.match(entry,/OPERATOR LAB','\.\/operator-lab\.html/);
 assert.doesNotMatch(entry,/One unit\. Every deployment leaves a history\./);
 assert.doesNotMatch(entry,/ACTIVE SLOT/);
});

test('compact title keeps safe accessibility and nested menu navigation',()=>{
 const ui=source('campaign-ui.ts');
 const css=source('campaign-style.css');
 const entry=ui.slice(ui.indexOf(' entry(hasSave:boolean'),
  ui.indexOf(' dispatchCreator(){'));
 assert.match(entry,/subpage\.addEventListener\('keydown'/);
 assert.match(entry,/event\.key!=='Escape'/);
 assert.match(entry,/trigger\.focus\(\{preventScroll:true\}\)/);
 assert.match(entry,/arsenal\.href='\.\/arsenal\.html'/);
 assert.match(css,/height:100dvh/);
 assert.match(css,/max-height:540px/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/campaign-landing-choices:has\(> :only-child\)/);
});

test('restart from Settings dismisses the sheet then reopens the briefing',()=>{
 const main=source('breach-main.ts');
 const screens=source('ui/breach-mission-screens.ts');
 assert.match(main,/missionScreens\.bindMissionActions\(/);
 assert.match(screens,/ui\.restart\.addEventListener\('click',async\(\)=>\{/);
 assert.match(screens,/port\.restartMission\(\);closeMissionSettings\(false\);showMissionBriefing\(\);/);
 assert.match(main,/const showMissionBriefing=missionScreens\.showBriefing/);
 assert.match(screens,/function showMissionBriefing\(\)\{[\s\S]*?setBriefingView\('brief'\);[\s\S]*?ui\.briefingPanel\.hidden=false;/);
});

test('replay library retains title-menu provenance through playback',()=>{
 const main=source('breach-main.ts');
 const library=source('ui/breach-replay-library-controller.ts');
 assert.match(main,/openReplayLibrary:\(\)=>replayLibrary\.openFromMenu\(\)/);
 assert.match(main,/replayLibrary\.afterReplayExit\(\)/);
 assert.match(main,/returnToCampaignMenu:\(\)=>\{/);
 assert.match(library,/function openFromMenu\(\):void\{/);
 assert.match(main,/onLibraryOpen:fromMenu=>\{appFlow\.openLibrary\(fromMenu\);\}/);
 assert.match(main,/onLibraryClose:restore=>appFlow\.closeLibrary\(restore\)/);
 assert.match(library,/config\.hideCampaignScreen\(\);\s*show\(true\);/);
 assert.match(library,/hide\(false\);[\s\S]*?entrySource='library';\s*config\.enterReplay\(\);/);
 assert.match(library,/config\.onLibraryClose\?\.\(restoreMenu\)/);
 assert.match(library,/if\(entrySource==='library'\)\{[\s\S]*?show\(\);/);
 assert.doesNotMatch(library,/let returnToMenu=false/);
});

test('Operations first viewport keeps readiness ahead of secondary controls',()=>{
 const ui=source('campaign-ui.ts');
 const overview=ui.slice(ui.indexOf("const overview=node('section','campaign-section campaign-overview')"),
  ui.indexOf('grid.append(overview,logistics)'));
 assert.match(overview,/overview\.insertBefore\(readiness,nextCard\.nextSibling\)/);
 assert.match(overview,/overview\.insertBefore\(stats,readiness\.nextSibling\)/);
 assert.match(overview,/overview\.insertBefore\(suppliesSummary,stats\.nextSibling\)/);
 assert.match(overview,/overview\.insertBefore\(shortcuts,suppliesSummary\.nextSibling\)/);
 assert.doesNotMatch(overview,/nextAction\.nextSibling/);
});

test('Operations primary action does not send an idle squad to an empty case board',()=>{
 const ui=source('campaign-ui.ts');
 const overview=ui.slice(ui.indexOf("const overview=node('section','campaign-section campaign-overview')"),
  ui.indexOf('grid.append(overview,logistics)'));
 assert.match(overview,/this\.handlers\.resumeContract/);
 assert.match(overview,/availableContracts\.length\?\s*button\('BROWSE CONTRACTS/);
 assert.match(overview,/button\('REVIEW SQUAD & READINESS',\s*\(\)=>activateTab\('personnel'\)/);
 assert.match(overview,/button\('BROWSE CONTRACTS · '/);
});
