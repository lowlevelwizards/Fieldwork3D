import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const main=read('src/breach-main.ts');
const screens=read('src/ui/breach-mission-screens.ts');
const navigation=read('src/ui/tactical-sheet-navigation.ts');

test('Stage 11 uses a single mission screen coordinator without changing mission authority',()=>{
 assert.match(main,/const missionScreens=createBreachMissionScreens\(/);
 for(const method of ['bindSitePreferences','bindMenus','syncBriefingCard',
   'syncMissionPhase','syncNextSiteControls'])
  assert.ok(main.includes('missionScreens.'+method+'()'),method);
 assert.doesNotMatch(main,/function syncBriefingCard\(/);
 assert.doesNotMatch(main,/createTacticalSheetNavigation\(/);
 assert.match(screens,/createTacticalSheetNavigation\(/);
 assert.doesNotMatch(screens,/newSession\(|campaign=|stepSession\(/);
 assert.match(navigation,/focusFirst/);
 assert.match(navigation,/event\.key==='Escape'/);
});

test('briefing is still planning-only and retains authoritative mission text',()=>{
 assert.match(screens,/function showMissionBriefing\(\)/);
 assert.match(screens,/config\.getSession\(\)\.phase!=='planning'/);
 assert.match(screens,/config\.isReplaying\(\)/);
 assert.match(screens,/setBriefingView\('brief'\)/);
 assert.match(screens,/ui\.briefingBody\.textContent=brief\.objective/);
 assert.match(screens,/ui\.briefingCondition\.textContent=brief\.condition/);
 assert.match(screens,/ui\.briefingExtraction\.textContent=brief\.extraction/);
 assert.match(screens,/config\.getEntryId\(\)===briefingRenderedEntry/);
});

test('settings and next-site choices retain their original scope',()=>{
 assert.match(screens,/function collapseTacticalSheets\(/);
 assert.match(screens,/siteChoiceOwner===button/);
 assert.match(screens,/config\.getSession\(\)\.started/);
 assert.match(screens,/config\.getMode\(\)==='mission'/);
 assert.match(screens,/config\.setScale\(selected as SiteScale\)/);
 assert.match(screens,/config\.setIntel\(selected as IntelMode\)/);
 assert.match(screens,/config\.intelPreferenceKey/);
 assert.match(screens,/history\.replaceState/);
 assert.match(screens,/changeCamera\(mode\)/);
 assert.match(screens,/config\.fitCamera\(\)/);
});

test('miniature focus stays opt-in and stores only a visual preference',()=>{
 assert.match(screens,/\[data-miniature-focus\]/);
 assert.match(screens,/initialMiniatureFocusMode/);
 assert.match(screens,/config\.setFocusMode\(value\)/);
 assert.match(screens,/localStorage\.setItem\(MINIATURE_FOCUS_STORAGE_KEY,value\)/);
 assert.match(main,/setFocusMode:mode=>stage\?\.setMiniatureFocusMode\(mode\)/);
});
