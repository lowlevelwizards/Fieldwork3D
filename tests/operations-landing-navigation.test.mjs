import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(name)=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');

test('landing offers two clear play modes, replay library and a separate labs drawer',()=>{
 const ui=source('campaign-ui.ts');
 assert.match(ui,/campaign-landing-hero/);
 assert.match(ui,/campaign-landing-actions/);
 assert.match(ui,/campaign-landing-card campaign-landing-primary/);
 assert.match(ui,/campaign-landing-card campaign-landing-quick/);
 assert.match(ui,/this\.handlers\.openReplayLibrary/);
 assert.match(ui,/LABS \/ DEVELOPMENT WORKBENCHES/);
 assert.match(ui,/OPERATOR LAB','\.\/operator-lab\.html/);
 assert.match(ui,/MAP LAB','\.\/map-lab\.html/);
 assert.match(ui,/MANAGE SAVES \/ IMPORT/);
 assert.match(ui,/hasSave\?'CONTINUE CAMPAIGN':'NEW CAMPAIGN'/);
});

test('restart from Settings dismisses the sheet then reopens the briefing',()=>{
 const main=source('breach-main.ts');
 assert.match(main,/ui\.restart\.addEventListener\('click',async\(\)=>\{[\s\S]*?restartMission\(\);\s*closeMissionSettings\(false\);\s*showMissionBriefing\(\);/);
 assert.match(main,/function showMissionBriefing\(\)\{[\s\S]*?setBriefingView\('brief'\);[\s\S]*?ui\.briefingPanel\.hidden=false;/);
});

test('replay library retains title-menu provenance through playback',()=>{
 const main=source('breach-main.ts');
 assert.match(main,/openReplayLibrary:\(\)=>\{\s*replayLibraryReturnToMenu=true;\s*campaignScreen\.hide\(\);showSavedReplayLibrary\(\);/);
 assert.match(main,/hideSavedReplayLibrary\(false\);[\s\S]*?replayEntrySource='library';enterReplay\(\);/);
 assert.match(main,/if\(restoreMenu&&replayLibraryReturnToMenu\)\{[\s\S]*?campaignScreen\.entry\(!!campaign\);/);
 assert.match(main,/if\(replayEntrySource==='library'\)\{[\s\S]*?showSavedReplayLibrary\(\);/);
});
