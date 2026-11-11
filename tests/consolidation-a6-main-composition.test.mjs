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

test('A6 replay actor option creation belongs to existing replay HUD',()=>{
 const hud=readFileSync(new URL('../src/ui/breach-replay-hud-controller.ts',import.meta.url),'utf8');
 assert.match(source,/replayHudController\?\.populateInspectActors\(/);
 assert.match(hud,/function populateInspectActors\(/);
 assert.match(hud,/function populateCameraChoices\(/);
});

test('A6 existing replay HUD owns all quick/direct/late replay button event binding',()=>{
 const hud=readFileSync(new URL('../src/ui/breach-replay-hud-controller.ts',import.meta.url),'utf8');
 for(const control of ['replayQuickView','replayDirectSight','replayContactLens','replayExportVideo','replayExit']){
  assert.doesNotMatch(source,new RegExp('ui\\.'+control+'\\.addEventListener'));
  assert.match(hud,new RegExp('config\\.ui\\.'+control+'\\.addEventListener'));
 }
 for(const group of ['bindQuickInteractions','bindDirectInteractions','bindLateInteractions'])
  assert.match(source,new RegExp('replayHudController\\.'+group+'\\(\\)'));
 assert.match(hud,/if\(quickBound\)return/);
 assert.match(hud,/if\(directBound\)return/);
 assert.match(hud,/if\(lateBound\)return/);
});

test('A6 tactical button DOM and command binding has a single existing HUD owner',()=>{
 const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 assert.match(source,/hudController\.bindToolbar\(/);
 assert.doesNotMatch(source,/ui\.clear\.addEventListener/);
 assert.doesNotMatch(source,/function casualtyActionButton/);
 assert.match(hud,/function bindToolbar\(/);
 assert.match(hud,/if\(toolbarButtons\)return toolbarButtons/);
 assert.match(hud,/port\.ui\.clear\.addEventListener/);
 assert.match(hud,/planMedicalTreatment\(/);
});

test('A6 mission screen owner owns navigation and keyboard GO lifecycle',()=>{
 const screens=readFileSync(new URL('../src/ui/breach-mission-screens.ts',import.meta.url),'utf8');
 assert.match(source,/missionScreens\.bindMissionActions\(/);
 assert.match(source,/missionScreens\.executePlay\(true\)/);
 assert.doesNotMatch(source,/ui\.restart\.addEventListener/);
 assert.doesNotMatch(source,/ui\.play\.addEventListener/);
 assert.match(screens,/function bindMissionActions\(/);
 assert.match(screens,/function executePlay\(/);
 assert.match(screens,/if\(missionActionPorts\)return/);
});

test('A6 one-time dynamic DOM mounts are stateless UI-view work',()=>{
 const elements=readFileSync(new URL('../src/ui/breach-ui-elements.ts',import.meta.url),'utf8');
 assert.match(source,/mountBreachDebugPanels\(/);
 assert.match(source,/mountBreachManagementElements\(/);
 assert.match(source,/mountBreachDeploymentButton\(/);
 assert.doesNotMatch(source,/const operationsToggle=document\.createElement/);
 assert.doesNotMatch(source,/const replayDirectorDebugPanel=replayDirectorDiagnostics/);
 for(const helper of ['mountBreachDebugPanels','mountBreachManagementElements','mountBreachDeploymentButton'])
  assert.match(elements,new RegExp('export function '+helper+'\\('));
});

test('A6 the existing world renderer owns ordered 2D layers and Bodycam isolation',()=>{
 const world=readFileSync(new URL('../src/breach-2d-world-renderer.ts',import.meta.url),'utf8');
 assert.match(source,/renderBreachTacticalWorldFrame\(/);
 assert.doesNotMatch(source,/world2D\.terrain\(\)/);
 assert.match(world,/function renderBreachTacticalWorldFrame\(/);
 assert.match(world,/if\(stage\.isReplayBodycamActive\(\)\)/);
 assert.match(world,/world2D\.architecture\(\);fog2D\.renderFog\(\)/);
});

test('A6 Campaign roster hydration belongs to existing Campaign flow',()=>{
 const campaign=readFileSync(new URL('../src/breach-campaign-flow.ts',import.meta.url),'utf8');
 assert.match(source,/applyCampaignRosterToSession\(session,campaign\)/);
 assert.doesNotMatch(source,/const fitted=fitMagazineInventory/);
 assert.match(campaign,/export function applyCampaignRosterToSession\(/);
 assert.match(campaign,/allocateFlashSupply\(/);
 assert.match(campaign,/stageMagazines\(/);
});

test('A6 briefing dossier construction is owned by mission-screens view',()=>{
 const screens=readFileSync(new URL('../src/ui/breach-mission-screens.ts',import.meta.url),'utf8');
 assert.match(source,/buildBriefingDossier\(session,risk,briefingPreviewEnabled/);
 assert.match(screens,/export function buildBriefingDossier\(/);
 assert.match(screens,/attachCampaignDossierContext\(dossier,campaign\)/);
 assert.match(screens,/Safe static contract fallback/);
});
