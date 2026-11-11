import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBreachAppFlow} from '../src/breach-app-flow.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('A3: legacy mode and visible surface are separate; no implicit mission creation',()=>{
 const menu=createBreachAppFlow('menu');
 assert.deepEqual(menu.snapshot(),{
  mode:'menu',surface:'menu',overlay:null,replayReturn:null,
  replayEntry:null,libraryReturnsToMenu:false
 });
 assert.ok(Object.isFrozen(menu.snapshot()));
 menu.setMode('quick');
 assert.equal(menu.mode,'quick');
 assert.equal(menu.surface,'menu','choosing Quick Play does not invent a Session');
 menu.missionMounted();
 assert.equal(menu.surface,'tactical');
 menu.setMode('home');
 assert.equal(menu.surface,'home');
 menu.setMode('mission');
 assert.equal(menu.surface,'home','contract selection alone does not fabricate a mission');
 menu.missionMounted();
 assert.equal(menu.surface,'tactical');
 menu.setMode('menu');
 assert.equal(menu.surface,'menu');
 assert.equal(createBreachAppFlow('home').surface,'home');
 assert.equal(createBreachAppFlow('quick').surface,'tactical');
 assert.equal(createBreachAppFlow('mission').surface,'tactical');
});

test('A3: non-destructive creator overlays never mutate mission, plans, or return surface',()=>{
 const flow=createBreachAppFlow('quick');
 const live={id:'original-session',plans:[{x:12,y:30}],seconds:32};
 const reference=JSON.stringify(live);
 flow.briefingVisibility(true);
 assert.equal(flow.surface,'briefing');
 assert.equal(flow.creatorVisibility(true),true);
 assert.equal(flow.overlay,'quick-play-creator');
 assert.equal(flow.surface,'briefing');
 flow.creatorVisibility(true);
 flow.creatorVisibility(false);
 assert.equal(flow.overlay,null);
 assert.equal(flow.surface,'briefing','closing creator returns to the same briefing');
 assert.equal(JSON.stringify(live),reference,'open/close cannot touch current mission');
 assert.equal(flow.creatorVisibility(true),true);
 flow.creatorVisibility(false); // worker start
 flow.creatorVisibility(true); // cancelled worker returns to creator
 assert.equal(flow.overlay,'quick-play-creator');
 assert.equal(flow.mode,'quick');
 flow.creatorVisibility(false);
 assert.equal(flow.surface,'briefing');
 flow.missionMounted(); // only a completed worker replacement reaches this
 assert.equal(flow.surface,'tactical');
});

test('A3: settings and briefing must represent actual successful sheet changes',()=>{
 const flow=createBreachAppFlow('mission');
 flow.briefingVisibility(true);
 assert.equal(flow.surface,'briefing');
 flow.briefingVisibility(true);
 flow.settingsVisibility(true);
 assert.equal(flow.overlay,'settings');
 flow.briefingVisibility(false);
 assert.equal(flow.surface,'tactical');
 flow.settingsVisibility(false);
 assert.equal(flow.overlay,null);
 flow.observePhase('running');
 assert.equal(flow.surface,'tactical');
 flow.briefingVisibility(true); // presentation controller gates the actual request
 assert.equal(flow.surface,'briefing');
 flow.observePhase('running');
 assert.equal(flow.surface,'tactical');
 flow.observePhase('lost');
 assert.equal(flow.surface,'debrief');
 flow.observePhase('lost');
 assert.equal(flow.surface,'debrief');
 flow.observePhase('planning');
 assert.equal(flow.surface,'tactical','restart reverts debrief without opening a panel');
 flow.setMode('home');
 assert.equal(flow.briefingVisibility(true),false);
 assert.equal(flow.settingsVisibility(true),false);
 assert.equal(flow.surface,'home');
});

test('A3: after-action replay restores the exact prior debrief destination',()=>{
 const flow=createBreachAppFlow('quick');
 flow.observePhase('won');
 assert.equal(flow.surface,'debrief');
 assert.equal(flow.beginReplay('debrief'),true);
 assert.equal(flow.surface,'replay');
 assert.equal(flow.snapshot().replayReturn,'debrief');
 assert.equal(flow.snapshot().replayEntry,'debrief');
 flow.observePhase('planning'); // historical snapshots never change navigation
 assert.equal(flow.surface,'replay');
 assert.equal(flow.beginReplay('debrief'),false);
 assert.equal(flow.briefingVisibility(true),false);
 assert.equal(flow.creatorVisibility(true),false);
 assert.equal(flow.exitReplay(),true);
 assert.equal(flow.surface,'debrief');
 assert.equal(flow.snapshot().replayReturn,null);
 assert.equal(flow.exitReplay(),false);
});

test('A3: saved replay from front menu returns to the library then the menu',()=>{
 const flow=createBreachAppFlow('menu');
 assert.equal(flow.openLibrary(true),true);
 assert.equal(flow.overlay,'replay-library');
 assert.equal(flow.snapshot().libraryReturnsToMenu,true);
 assert.equal(flow.closeLibrary(false),false,'hide to start playback is not Back');
 assert.equal(flow.overlay,null);
 assert.equal(flow.snapshot().libraryReturnsToMenu,true);
 assert.equal(flow.beginReplay('library'),true);
 assert.equal(flow.surface,'replay');
 assert.equal(flow.exitReplay(),true);
 assert.equal(flow.surface,'menu');
 flow.openLibrary(false); // library reopens after archived film restoration
 assert.equal(flow.snapshot().libraryReturnsToMenu,true);
 assert.equal(flow.closeLibrary(true),true);
 assert.equal(flow.surface,'menu');
 assert.equal(flow.mode,'menu');
 assert.equal(flow.snapshot().libraryReturnsToMenu,false);
 const debrief=createBreachAppFlow('quick');
 debrief.observePhase('won');
 debrief.openLibrary();
 assert.equal(debrief.closeLibrary(),false,'gameplay library must not force the title menu');
 assert.equal(debrief.surface,'debrief');
 assert.equal(debrief.mode,'quick');
});

test('A3: Quick Play favorite from menu library mounts a real Quick Play session',()=>{
 const flow=createBreachAppFlow('menu');
 flow.openLibrary(true);
 flow.setMode('quick'); // selected saved favorite
 assert.equal(flow.closeLibrary(false),false,'replacement release is not a menu Back');
 flow.missionMounted();
 assert.equal(flow.mode,'quick');
 assert.equal(flow.surface,'tactical');
 assert.equal(flow.snapshot().libraryReturnsToMenu,false);
 flow.briefingVisibility(true);
 assert.equal(flow.surface,'briefing');
});

test('A3: transitions are idempotent, invalid overlay/replay entry cannot hijack state',()=>{
 const flow=createBreachAppFlow('menu');
 assert.equal(flow.settingsVisibility(true),false);
 assert.equal(flow.beginReplay('debrief'),true); // no gameplay mutation
 assert.equal(flow.beginReplay('library'),false);
 assert.equal(flow.openLibrary(true),false);
 assert.equal(flow.creatorVisibility(true),false);
 assert.equal(flow.exitReplay(),true);
 assert.equal(flow.exitReplay(),false);
 assert.equal(flow.creatorVisibility(true),true);
 assert.equal(flow.openLibrary(true),false);
 assert.equal(flow.settingsVisibility(true),false);
 flow.creatorVisibility(false);
 assert.equal(flow.openLibrary(true),true);
 flow.openLibrary(true);
 assert.equal(flow.closeLibrary(true),true);
 assert.equal(flow.closeLibrary(true),false);
});

test('A3: composition uses AppFlow for mode, real visibility, mission and replay handoffs',()=>{
 const main=source('src/breach-main.ts');
 const config=source('src/ui/quick-play-configurator.ts');
 const quick=source('src/breach-quickplay-controller.ts');
 const screens=source('src/ui/breach-mission-screens.ts');
 const library=source('src/ui/breach-replay-library-controller.ts');
 const flow=source('src/breach-app-flow.ts');
 assert.match(main,/createBreachAppFlow\(/);
 assert.match(main,/appFlow\.missionMounted\(\)/);
 assert.match(main,/appFlow\.observePhase\(state\.phase\)/);
 assert.match(main,/appFlow\.beginReplay\(source\)/);
 assert.match(main,/appFlow\.exitReplay\(\)/);
 assert.match(main,/appFlow\.setMode\(mode\)/);
 assert.match(main,/appFlow\.creatorVisibility\(visible\)/);
 assert.match(main,/appFlow\.briefingVisibility\(visible\.briefing\)/);
 assert.match(main,/appFlow\.settingsVisibility\(visible\.settings\)/);
 assert.match(main,/appFlow\.openLibrary\(fromMenu\)/);
 assert.match(main,/appFlow\.closeLibrary\(restore\)/);
 assert.doesNotMatch(main,/let campaignMode:CampaignMode/);
 assert.match(config,/onVisibilityChange\?\(true\)/);
 assert.match(config,/onVisibilityChange\?\(false\)/);
 assert.match(quick,/onVisibilityChange:config\.onConfiguratorVisibilityChange/);
 assert.match(screens,/onPresentationChange/);
 assert.match(library,/hide\(false\)/);
 assert.doesNotMatch(library,/let returnToMenu=false/);
 for(const banned of ['newSession','stepSession','localStorage',
   'fetch(','MissionRecorder','from \'./breach-replay-mode-controller.ts\''])
  assert.ok(!flow.includes(banned),'pure flow has no gameplay, film, or IO ownership: '+banned);
});
