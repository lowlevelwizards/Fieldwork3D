import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const elements=readFileSync(new URL('../src/ui/breach-ui-elements.ts',import.meta.url),'utf8');
test('A6 fixed tactical DOM registry lives in stateless UI view module',()=>{
 assert.match(source,/createBreachUiElements\(\)/);
 assert.doesNotMatch(source,/const ui=\s*\{/);
 assert.doesNotMatch(source,/decorateIconButton\(/);
 assert.match(elements,/export function createBreachUiElements\(\)/);
 assert.match(elements,/requiredBreachElement/);
 assert.match(elements,/replayNextEvent/);
});

test('A6 display toggle events are bound once by the existing replay HUD owner',()=>{
 const replay=readFileSync(new URL('../src/ui/breach-replay-hud-controller.ts',import.meta.url),'utf8');
 for(const action of ["replayDirectTracers","replayDirectXray","replayAnalysis","replayPlans","replayNames","replayPlanVersion","replayTraces","replayGhosts","replayTrails"]){
  assert.doesNotMatch(source,new RegExp('ui\\.'+action+'\\.addEventListener'));
  assert.match(replay,new RegExp('ui\\.'+action+'\\.addEventListener'));
 }
 assert.match(replay,/if\(bound\)return/);
});

test('A6 palette owner derives authorized context actions, not the entrypoint',()=>{
 const palette=readFileSync(new URL('../src/ui/tactical-palette-controller.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/const civilianAtPlan=/);
 assert.doesNotMatch(source,/const nearMovable=/);
 assert.match(palette,/showFromAuthorizedState/);
 assert.match(palette,/const civilianAtPlan=/);
 assert.match(palette,/liveVisibility\(state,c\.p\)/);
});

test('A6 entrypoint delegates session HUD formatting to existing HUD owner',()=>{
 const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 assert.match(source,/hudController\.renderSession\(/);
 assert.doesNotMatch(source,/const siteSubheading=document\.querySelector/);
 assert.doesNotMatch(source,/canvas\.dataset\.auditRoutePoints=/);
 assert.match(hud,/function renderSession\(/);
 assert.match(hud,/renderMissionDebrief\(/);
});

test('A6 main composes a single keyboard shortcut binding',()=>{
 const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 assert.match(source,/hudController\.bindShortcuts\(/);
 assert.doesNotMatch(source,/window\.addEventListener\('keydown'/);
 assert.match(hud,/window\.addEventListener\('keydown'/);
 assert.match(hud,/if\(shortcutsBound\)return/);
});

test('A6 ground authoring is committed by the existing pointer-command owner',()=>{
 const pointer=readFileSync(new URL('../src/breach-pointer-command-controller.ts',import.meta.url),'utf8');
 assert.match(source,/commitTacticalGroundCommand\(/);
 assert.doesNotMatch(source,/const retargetingActive=/);
 assert.match(pointer,/const retargetingActive=/);
 assert.match(pointer,/planDoorFlash\(/);
 assert.match(pointer,/setFirePolicy\(/);
});

test('A6 QA fixture does not occupy main and stays explicitly gated',()=>{
 const qa=readFileSync(new URL('../src/breach-replay-bodycam-qa.ts',import.meta.url),'utf8');
 assert.match(source,/if\(import\.meta\.env\.DEV&&bootConfig\.bodycamQa\)/);
 assert.match(source,/installReplayBodycamQa\(/);
 assert.doesNotMatch(source,/BODYCAM INDOOR ENTRY \/ QA/);
 assert.match(qa,/BODYCAM INDOOR ENTRY \/ QA/);
 assert.match(qa,/__fieldworkBodycamQa/);
});

test('A6 contextual UI dispatch binds once on HUD while game rules stay in domain module',()=>{
 const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 assert.match(source,/hudController\.bindContextActions\(/);
 assert.doesNotMatch(source,/const handleContextAction=/);
 assert.match(hud,/function bindContextActions\(/);
 assert.match(hud,/if\(contextActionsBound\)return/);
 assert.match(hud,/dispatchTacticalContextCommand\(/);
});
