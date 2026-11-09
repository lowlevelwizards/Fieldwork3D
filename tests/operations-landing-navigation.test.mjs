import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=(name)=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');

test('landing preserves clear play choices, replay and tools without manufactured labels',()=>{
 const ui=source('campaign-ui.ts');
 const entry=ui.slice(ui.indexOf(' entry(hasSave:boolean){'),
  ui.indexOf(' home(c:CampaignState){'));
 assert.match(entry,/campaign-landing-hero/);
 assert.match(entry,/campaign-landing-actions/);
 assert.match(entry,/campaign-landing-card campaign-landing-primary/);
 assert.match(entry,/campaign-landing-card campaign-landing-quick/);
 assert.match(entry,/this\.handlers\.openReplayLibrary/);
 assert.match(entry,/OPERATOR LAB','\.\/operator-lab\.html/);
 assert.match(entry,/MAP LAB','\.\/map-lab\.html/);
 assert.match(entry,/SAVES \/ IMPORT/);
 assert.match(entry,/hasSave\?'CONTINUE CAMPAIGN':'NEW CAMPAIGN'/);
 assert.doesNotMatch(entry,/TACTICAL \/ PERSISTENT \/ HUMAN/);
 assert.doesNotMatch(entry,/FIELD OPERATIONS · 001/);
 assert.doesNotMatch(entry,/↗|campaign-landing-arrow/);
 assert.doesNotMatch(entry,/campaign-landing-card-caption|campaign-landing-card-index/);
 assert.doesNotMatch(entry,/SELECT OPERATION|01 — 02|Start another unit/);
 assert.doesNotMatch(entry,/d9cb8d|134 206|ROOM 0/);
});

test('restart from Settings dismisses the sheet then reopens the briefing',()=>{
 const main=source('breach-main.ts');
 assert.match(main,/ui\.restart\.addEventListener\('click',async\(\)=>\{[\s\S]*?restartMission\(\);\s*closeMissionSettings\(false\);\s*showMissionBriefing\(\);/);
 assert.match(main,/function showMissionBriefing\(\)\{[\s\S]*?setBriefingView\('brief'\);[\s\S]*?ui\.briefingPanel\.hidden=false;/);
});

test('replay library retains title-menu provenance through playback',()=>{
 const main=source('breach-main.ts');
 const library=source('ui/breach-replay-library-controller.ts');
 assert.match(main,/openReplayLibrary:\(\)=>replayLibrary\.openFromMenu\(\)/);
 assert.match(main,/replayLibrary\.afterReplayExit\(\)/);
 assert.match(main,/returnToCampaignMenu:\(\)=>\{/);
 assert.match(library,/function openFromMenu\(\):void\{/);
 assert.match(library,/returnToMenu=true;\s*config\.hideCampaignScreen\(\);\s*show\(\);/);
 assert.match(library,/hide\(false\);[\s\S]*?entrySource='library';\s*config\.enterReplay\(\);/);
 assert.match(library,/if\(restoreMenu&&returnToMenu\)\{[\s\S]*?config\.returnToCampaignMenu\(\);/);
 assert.match(library,/if\(entrySource==='library'\)\{[\s\S]*?show\(\);/);
});
