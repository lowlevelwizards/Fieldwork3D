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

test('Operations first viewport keeps priority ahead of secondary controls',()=>{
 const ui=source('campaign-ui.ts');
 const overview=ui.slice(ui.indexOf("const overview=node('section','campaign-section campaign-overview')"),
  ui.indexOf('grid.append(overview,logistics)'));
 assert.match(overview,/const workspace=node\('div','campaign-overview-workspace'\)/);
 assert.match(overview,/priority\.append\(nextCard,readiness\)/);
 assert.match(overview,/support\.append\(shortcuts\)/);
 assert.match(overview,/projectOperationsSummary\(c\)/);
 assert.match(overview,/campaign-uxr-status-strip/);
 assert.match(overview,/if\(department\)support\.append\(department\)/);
 assert.match(overview,/workspace\.append\(priority,support\)/);
 assert.match(overview,/overview\.append\(workspace,footer\)/);
 assert.doesNotMatch(overview,/overview\.insertBefore\(readiness/);
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

test('desktop title scene uses available screen space without changing phone navigation',()=>{
 const css=source('campaign-style.css');
 const entry=source('campaign-ui.ts').slice(
  source('campaign-ui.ts').indexOf(' entry(hasSave:boolean'),
  source('campaign-ui.ts').indexOf(' dispatchCreator(){'));
 const desktop=css.slice(css.indexOf('/* UI R13: desktop-first title composition'));
 assert.match(desktop,/@media\(min-width:820px\) and \(min-height:620px\)/);
 assert.match(desktop,/\.campaign-landing:not\(\.campaign-landing-subpage\)/);
 assert.match(desktop,/grid-template-columns:minmax\(0,1\.06fr\) minmax\(350px,\.94fr\)/);
 assert.match(desktop,/\.campaign-landing-hero\{[\s\S]*?grid-area:1 \/ 1/);
 assert.match(desktop,/\.campaign-landing-actions\{[\s\S]*?grid-area:1 \/ 2/);
 assert.match(desktop,/\.campaign-landing-utility\{[\s\S]*?grid-area:2 \/ 1 \/ 3 \/ 3/);
 assert.match(css,/\.campaign-landing-intro\{display:none\}/);
 assert.match(entry,/node\('p','campaign-landing-intro'/);
 assert.match(entry,/main\.append\(hero,actions,utility\)/);
 assert.match(entry,/subpage\.hidden=true;main\.hidden=false/);
});

test('Operations uses wide workspace columns without narrowing mobile fallback',()=>{
 const css=source('campaign-style.css');
 const desktop=css.slice(css.indexOf('/* UI R14: Operations Room uses its width'));
 assert.match(desktop,/\.campaign-overview-workspace\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(desktop,/@media\(min-width:900px\)/);
 assert.match(desktop,/\.campaign-shell\.campaign-wide:has\(\.campaign-tabs\)\{max-width:1140px\}/);
 assert.match(desktop,/grid-template-columns:minmax\(0,1\.1fr\) minmax\(340px,\.9fr\)/);
 assert.match(desktop,/\.campaign-overview-support\{gap:16px\}/);
});

test('Cases preserve deadline order and expose every offer through focused navigation',()=>{
 const ui=source('campaign-ui.ts');
 const cases=ui.slice(ui.indexOf("const jobs=node('section','campaign-section')"),
  ui.indexOf('grid.append(jobs)'));
 assert.match(cases,/const openContracts=c\.contracts\.filter/);
 assert.match(cases,/const sorted=\[\.\.\.openContracts\]\.sort\(\(a,b\)=>/);
 assert.match(cases,/a\.deadline-b\.deadline\|\|a\.id\.localeCompare\(b\.id\)/);
 assert.match(cases,/campaign-uxr-case-browser/);
 assert.match(cases,/campaign-uxr-case-pages/);
 assert.match(cases,/campaign-uxr-case-position/);
 assert.match(cases,/const pages=sorted\.map\(k=>this\.contract\(k,c\)\)/);
 assert.match(cases,/const selectCase=\(index:number\)=>/);
 assert.match(cases,/this\.selectedCaseId=sorted\[current\]\.id/);
 assert.match(cases,/Math\.abs\(deltaX\)>55/);
 assert.doesNotMatch(cases,/const visible=sorted\.slice\(0,3\)/);
 assert.match(cases,/button\('CONTINUE DEPLOYMENT'/);
});

test('Cases board stays single-column on phones and uses desktop columns when wide',()=>{
 const css=source('campaign-style.css');
 const cases=css.slice(css.indexOf('/* UI R15: fit the Cases board'));
 assert.match(cases,/\.campaign-contract-board\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(cases,/@media\(min-width:900px\)/);
 assert.match(cases,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(cases,/\.campaign-contract:first-child\{grid-column:1\/-1\}/);
 assert.match(cases,/\.campaign-contract-more>summary\{display:flex/);
 assert.match(cases,/\.campaign-contract-more>\.campaign-contract-board\{margin-top:13px\}/);
});

test('Squad shows one visual deployment team and a selected operator inspector',()=>{
 const ui=source('campaign-ui.ts');
 const personnel=ui.slice(ui.indexOf("const personnel=node('section','campaign-section')"),
  ui.indexOf("const logistics=node('section','campaign-section')"));
 assert.match(personnel,/const personnelWorkspace=node\('div','campaign-personnel-workspace'\)/);
 assert.match(personnel,/personnelWorkspace\.append\(deployment\)/);
 assert.match(personnel,/const activeOperators=c\.operators\.filter\(p=>/);
 assert.match(personnel,/p\.status!=='retired'&&p\.status!=='lost'/);
 assert.match(personnel,/node\('h2','','OPERATOR DETAIL'\)/);
 assert.match(personnel,/campaign-uxr-squad-grid/);
 assert.match(personnel,/campaign-uxr-reserve-tiles/);
 assert.match(personnel,/card\.hidden=p\.id!==selectedId/);
 assert.match(personnel,/if\(!activeOperators\.length\)roster\.append/);
 assert.match(personnel,/for\(const p of activeOperators\)/);
 assert.match(personnel,/rosterPanel\.append\(roster\)/);
 assert.match(personnel,/personnelWorkspace\.append\(rosterPanel\)/);
 assert.match(personnel,/personnel\.append\(personnelWorkspace\)/);
 assert.match(personnel,/this\.handlers\.assignSlot\(slot,p\.id\)/);
 assert.doesNotMatch(personnel,/this\.handlers\.assignSlot\(slot,picker\.value\)/);
 assert.match(personnel,/this\.handlers\.openStudio\(p\.id\)/);
});

test('Squad desktop columns keep slot selectors usable and phone roster full width',()=>{
 const css=source('campaign-style.css');
 const layout=css.slice(css.indexOf('/* UI R16: Squad preparation'));
 assert.match(layout,/\.campaign-personnel-workspace\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(layout,/@media\(min-width:1000px\)/);
 assert.match(layout,/grid-template-columns:minmax\(308px,\.82fr\) minmax\(0,1\.55fr\)/);
 assert.match(layout,/\.campaign-personnel-workspace \.campaign-assignment-slots\{/);
 assert.match(layout,/\.campaign-personnel-roster-panel \.campaign-roster\{/);
 assert.match(css,/@media\(max-width:600px\)\{[\s\S]*?\.campaign-roster,\.campaign-armory/);
});

test('Logistics has stock, replenish actions and armory in task-first DOM order',()=>{
 const ui=source('campaign-ui.ts');
 const logistics=ui.slice(ui.indexOf("const logistics=node('section','campaign-section')"),
  ui.indexOf("const recruit=button('RECRUIT OPERATOR"));
 assert.match(logistics,/const logisticsWorkspace=node\('div','campaign-logistics-workspace'\)/);
 assert.match(logistics,/const supplyPanel=node\('section','campaign-logistics-supply-panel'\)/);
 assert.match(logistics,/node\('h2','','RESERVE SUPPLIES'\)/);
 assert.match(logistics,/supplyPanel\.append\(stock\);/);
 assert.match(logistics,/supplyPanel\.append\(squadReplenish,node\('h3','campaign-logistics-buy-heading'/);
 assert.match(logistics,/supplyPanel\.append\(purchases\)/);
 assert.match(logistics,/logisticsWorkspace\.append\(supplyPanel\)/);
 assert.match(logistics,/procurement\.append\(node\('summary'[\s\S]*?inventory\)/);
 assert.match(logistics,/logisticsWorkspace\.append\(procurement\)/);
 assert.match(logistics,/logistics\.append\(logisticsWorkspace\)/);
 assert.match(logistics,/this\.handlers\.buyAmmo/);
 assert.match(logistics,/this\.handlers\.buyMedical/);
 assert.match(logistics,/this\.handlers\.buyFlash/);
 assert.match(logistics,/this\.handlers\.buyWeapon\(weapon\)/);
 assert.match(logistics,/buy\.disabled=!quote\.canPurchase/);
});

test('Logistics keeps one-column phones and separates supply and armory on desktops',()=>{
 const css=source('campaign-style.css');
 const layout=css.slice(css.indexOf('/* UI R17: the stock and purchase'));
 assert.match(layout,/\.campaign-logistics-workspace\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(layout,/@media\(min-width:1000px\)/);
 assert.match(layout,/grid-template-columns:minmax\(330px,\.9fr\) minmax\(0,1\.1fr\)/);
 assert.match(layout,/\.campaign-logistics-supply-panel \.campaign-purchases\{/);
 assert.match(layout,/\.campaign-logistics-workspace>\.campaign-armory\{/);
 assert.match(css,/@media\(max-width:600px\)\{\.campaign-purchases\{grid-template-columns:minmax\(0,1fr\)/);
});

test('Records expose eight indexed reports and lazily disclose older history',()=>{
 const ui=source('campaign-ui.ts');
 const records=ui.slice(ui.indexOf("const chronicle=node('section','campaign-section campaign-chronicle')"),
  ui.indexOf('const footer=node(\'div\',\'campaign-footer\')'));
 assert.match(records,/const recentReports=c\.history\.slice\(-8\)\.reverse\(\)/);
 assert.match(records,/const renderOperation=\(report:\(typeof c\.history\)\[number\]\)=>/);
 assert.match(records,/const operationBoard=node\('div','campaign-operation-board campaign-uxr-record-index'\)/);
 assert.match(records,/const record=button\('',\(\)=>inspect\(i\),'campaign-uxr-record-row'\)/);
 assert.match(records,/inspected\.replaceChildren\(renderOperation\(report\)\)/);
 assert.match(records,/this\.selectedRecordId=report\.id/);
 assert.match(records,/LATEST '\+recentReports\.length\+' OF '\+c\.history\.length/);
 assert.match(records,/if\(c\.history\.length>recentReports\.length\)/);
 assert.match(records,/const older=node\('details','campaign-operation-more'\)/);
 assert.match(records,/older\.addEventListener\('toggle',\(\)=>\{/);
 assert.match(records,/if\(!older\.open\|\|olderBoard\.childElementCount\)return/);
 assert.match(records,/for\(const report of c\.history\.slice\(0,-8\)\.reverse\(\)\)/);
 assert.match(records,/return article/);
 assert.match(records,/AFTER-ACTION RECORD/);
 assert.match(records,/chronicle\.append\(older\)/);
});

test('Records cards use a responsive grid with accessible history disclosure',()=>{
 const css=source('campaign-style.css');
 const records=css.slice(css.indexOf('/* UI R18: the Records tab'));
 assert.match(records,/\.campaign-operation-board\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(records,/@media\(min-width:900px\)/);
 assert.match(records,/\.campaign-operation-board\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(records,/\.campaign-operation-more>summary\{display:flex/);
 assert.match(records,/\.campaign-operation-more>summary::after\{content:'\+'/);
});

test('Operations tabs show only real open-case and recorded-operation counters',()=>{
 const ui=source('campaign-ui.ts');
 const tabs=ui.slice(ui.indexOf("const nav=node('nav','campaign-tabs')"),
  ui.indexOf('main.insertBefore(nav,grid)'));
 assert.match(tabs,/const openCaseCount=c\.contracts\.filter\(k=>/);
 assert.match(tabs,/k\.status==='available'&&k\.deadline>=c\.day\)\.length/);
 assert.match(tabs,/const recordedOperationCount=c\.history\.length/);
 assert.match(tabs,/const count=tab==='contracts'\?openCaseCount:/);
 assert.match(tabs,/tab==='chronicle'\?recordedOperationCount:0/);
 assert.match(tabs,/if\(count\)\{/);
 assert.match(tabs,/node\('span','campaign-tab-count',String\(count\)\)/);
 assert.match(tabs,/counter\.setAttribute\('aria-hidden','true'\)/);
 assert.match(tabs,/trigger\.setAttribute\('aria-label',accessibleLabel\)/);
 assert.match(tabs,/trigger\.setAttribute\('aria-controls',panel\.id\)/);
 assert.match(tabs,/trigger\.setAttribute\('aria-selected',String\(this\.homeTab===tab\)\)/);
 assert.match(tabs,/trigger\.tabIndex=this\.homeTab===tab\?0:-1/);
});

test('Counter layout preserves five evenly fitting phone tabs and selected contrast',()=>{
 const css=source('campaign-style.css');
 const layout=css.slice(css.indexOf('/* UI R19: contextual tab counters'));
 assert.match(css,/@media\(max-width:640px\)\{\s*\.campaign-tabs\{display:grid;grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
 assert.match(layout,/\.campaign-shell \.campaign-tab\{position:relative;display:flex/);
 assert.match(layout,/\.campaign-tab-count\{display:inline-flex/);
 assert.match(layout,/\.campaign-shell \.campaign-tab\[aria-selected="true"\] \.campaign-tab-count/);
 assert.match(layout,/@media\(max-width:640px\)/);
 assert.match(layout,/\.campaign-tab-count\{position:absolute;right:2px;top:2px/);
});

test('Operations preserves focused controls through purchase, treatment and assignment refreshes',()=>{
 const ui=source('campaign-ui.ts');
 const home=ui.slice(ui.indexOf(' home(c:CampaignState,slot?:CampaignSlot)'),
  ui.indexOf(' private armory(c:CampaignState,id:string)'));
 const owner=source('ui/campaign/home-view-continuity.ts');
 assert.match(home,/const homeView=captureCampaignHomeView\(this\.root\)/);
 assert.match(home,/restoreCampaignHomeView\(this\.root,nav,homeView\)/);
 assert.match(owner,/const wasInOperations=!root\.hidden&&/);
 assert.match(owner,/const focusedControl=wasInOperations&&root\.contains\(root\.ownerDocument\.activeElement\)\?/);
 assert.match(owner,/const focusedLabel=focusedControl\?\.getAttribute\('aria-label'\)/);
 assert.match(owner,/if\(restoreScroll>0\)root\.scrollTop=restoreScroll/);
 assert.match(owner,/if\(focusedLabel\)\{/);
 assert.match(owner,/\.find\(control=>control\.getAttribute\('aria-label'\)===focusedLabel&&/);
 assert.match(owner,/!control\.matches\(':disabled'\)/);
 assert.match(owner,/restored\?\?nav\.querySelector<HTMLElement>\('\[aria-selected="true"\]'\)/);
 assert.match(owner,/\.focus\(\{preventScroll:true\}\)/);
});

test('Operator action labels are unique by callsign while retaining existing handlers',()=>{
 const ui=source('campaign-ui.ts');
 const personnel=ui.slice(ui.indexOf("const personnel=node('section','campaign-section')"),
  ui.indexOf("const logistics=node('section','campaign-section')"));
 for(const label of [
  "Open '+p.callsign+' loadout",
  "Resupply ammunition for '+p.callsign",
  "Reissue medical supplies for '+p.callsign",
  "Treat '+p.callsign",
  "Retire '+p.callsign"
 ])assert.ok(personnel.includes(label),'Missing operator-scoped control '+label);
 for(const handler of [
  'this.handlers.resupply(p.id)','this.handlers.resupplyMedical(p.id)',
  'this.handlers.treat(p.id)','this.handlers.retire(p.id)',
  'this.handlers.assignSlot(slot,p.id)'
 ])assert.ok(personnel.includes(handler),'Existing action changed '+handler);
});

test('Operations browser acceptance owns phone, desktop and keyboard behavior',()=>{
 const script=readFileSync(new URL('../scripts/smoke-operations-room-responsive.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/operations-room-browser-acceptance.yml',import.meta.url),'utf8');
 assert.match(script,/width:1440,height:900,mobile:false/);
 assert.match(script,/width:390,height:844,mobile:true/);
 assert.match(script,/for\(const tab of \['overview','personnel','contracts','logistics','chronicle'\]\)/);
 assert.match(script,/d\.scroll<=d\.width\+3/);
 assert.match(script,/rect\.height>=44/);
 assert.match(script,/await last\.press\('Home'\)/);
 assert.match(script,/await first\.press\('End'\)/);
 assert.match(script,/await last\.press\('ArrowRight'\)/);
 assert.match(script,/page\.screenshot/);
 assert.match(workflow,/operations-room-browser-acceptance/);
 assert.match(workflow,/npx playwright install --with-deps chromium/);
 assert.match(workflow,/scripts\/smoke-operations-room-responsive\.mjs/);
 assert.match(workflow,/actions\/upload-artifact@v4/);
});


test('C5 Logistics preserves purchases, shows truthful low stock and discloses weapon eligibility',()=>{
 const ui=source('campaign-ui.ts');
 const logistics=ui.slice(ui.indexOf("const logistics=node('section','campaign-section')"),
  ui.indexOf("const recruit=button('RECRUIT OPERATOR"));
 assert.match(logistics,/if\(needed>count\)fact\.classList\.add\('is-low'\)/);
 assert.match(logistics,/fact\.classList\.add\('is-low'\)/);
 assert.match(logistics,/buy\.disabled=!canAffordCampaignPurchase\(c,cost\)/);
 assert.match(logistics,/buy\.setAttribute\('aria-description',why\)/);
 assert.match(logistics,/const eligibility=node\('details','campaign-procurement-eligibility'\)/);
 assert.match(logistics,/quote\.canPurchase\?'PURCHASE ELIGIBILITY':'UNAVAILABLE · VIEW REQUIREMENTS'/);
 assert.match(logistics,/eligibility\.append\(status\)/);
 assert.match(logistics,/buy\.setAttribute\('aria-describedby',reasonId\)/);
 assert.match(logistics,/buy\.disabled=!quote\.canPurchase/);
 assert.match(logistics,/this\.handlers\.buyWeapon\(weapon\)/);
});
test('C5 Logistics compact rows respect phone and desktop layout',()=>{
 const css=source('campaign-style.css');
 const c5=css.slice(css.indexOf('/* Campaign C5.3'));
 assert.ok(c5.length>100);
 assert.match(c5,/\.campaign-logistics-supply-panel \.campaign-supply-offer\{/);
 assert.match(c5,/flex-direction:row;align-items:center/);
 assert.match(c5,/\.campaign-procurement-eligibility>summary\{/);
 assert.match(c5,/min-height:40px/);
 assert.match(c5,/@media\(max-width:420px\)/);
 assert.match(css,/@media\(min-width:1000px\)[\s\S]*?\.campaign-logistics-workspace>/);
});


test('C6 Operations preserve visible outcomes and full optional evidence',()=>{
 const ui=source('campaign-ui.ts');
 const records=ui.slice(ui.indexOf("const chronicle=node('section','campaign-section campaign-chronicle')"),
  ui.indexOf("const footer=node('div','campaign-footer')"));
 assert.match(records,/heading\.append\(identity,node\('span','campaign-operation-outcome'/);
 assert.match(records,/article\.append\(facts\)/);
 assert.match(records,/const recordDetail=node\('details','campaign-operation-detail'\)/);
 assert.match(records,/const recordSummary=node\('summary','','OPERATION DETAILS'\)/);
 assert.match(records,/recordSummary\.setAttribute\('aria-label'/);
 assert.match(records,/const involved=report\.participatingIds\.map\(id=>/);
 assert.match(records,/recordDetail\.append\(detail\)/);
 assert.match(records,/article\.append\(recordDetail\)/);
 assert.match(records,/const timeline=node\('details','campaign-career-timeline'\)/);
 assert.match(records,/PERSONNEL MILESTONES · '\+highlights\.length/);
 assert.match(records,/item\.dataset\.kind=event\.kind/);
 assert.match(records,/timeline\.append\(entries\);chronicle\.append\(timeline\)/);
});
test('C6 Records detail and milestone summaries stay keyboard reachable',()=>{
 const css=source('campaign-style.css');
 const c6=css.slice(css.indexOf('/* Campaign C6.4'));
 assert.ok(c6.length>400);
 assert.match(c6,/\.campaign-operation-detail>summary\{/);
 assert.match(c6,/min-height:40px/);
 assert.match(c6,/\.campaign-operation-detail>summary:focus-visible\{/);
 assert.match(c6,/\.campaign-career-timeline>summary\{/);
 assert.match(c6,/min-height:46px/);
 assert.match(c6,/@media\(max-width:480px\)/);
});

test('C7 disclosure labels identify their individual case, weapon and operation',()=>{
 const ui=source('campaign-ui.ts');
 assert.match(ui,/caseSummary\.setAttribute\('aria-label','Case information: '\+view\.title/);
 assert.match(ui,/eligibilitySummary\.setAttribute\('aria-label'/);
 assert.match(ui,/for '\+weapon\.toUpperCase\(\)\+' platform'/);
 assert.match(ui,/recordSummary\.setAttribute\('aria-label'/);
 assert.match(ui,/\+' · DAY '\+report\.day/);
});


test('C8 UI-only disclosure continuity survives in-place campaign refresh',()=>{
 const ui=source('campaign-ui.ts');
 const home=ui.slice(ui.indexOf(' home(c:CampaignState,slot?:CampaignSlot)'),
  ui.indexOf(' private armory(c:CampaignState,id:string)'));
 const owner=source('ui/campaign/home-view-continuity.ts');
 assert.match(owner,/const openWorkspaceDetails=wasInOperations\?/);
 assert.match(owner,/details\[data-campaign-detail\]\[open\]/);
 assert.match(owner,/for\(const detail of root\.querySelectorAll<HTMLDetailsElement>\(/);
 assert.match(owner,/detail\.open=openWorkspaceDetails\.has/);
 for(const key of [
  'campaign-context','more-history','personnel-milestones',
  'service-record','related-cases','closeout-notes',
  'save-utilities','department-profile'
 ])assert.ok(home.includes("dataset.campaignDetail='"+key+"'"),
  'Disclosure missing persistence identity: '+key);
 assert.match(home,/recordDetail\.dataset\.campaignDetail='operation:'\+report\.id/);
 assert.match(home,/eligibility\.dataset\.campaignDetail='weapon:'\+weapon/);
 assert.match(ui,/intelligence\.dataset\.campaignDetail='case:'\+c\.id/);
});
test('C8 browser smoke tests continuity after a real campaign purchase',()=>{
 const script=readFileSync(new URL('../scripts/smoke-operations-room-responsive.mjs',import.meta.url),'utf8');
 assert.match(script,/const purchase=page\.locator\('\.campaign-supply-offer button:enabled'\)/);
 assert.match(script,/campaign context collapsed after purchase/);
 assert.match(script,/case information collapsed after purchase/);
 assert.match(script,/armory requirements collapsed after purchase/);
});

test('C9 browser acceptance includes domain-settled campaign persistence scenarios',()=>{
 const script=readFileSync(new URL('../scripts/smoke-operations-room-responsive.mjs',import.meta.url),'utf8');
 assert.match(script,/async function seedCareerScenario\(page\)/);
 assert.match(script,/await import\('\/src\/campaign-state\.ts'\)/);
 assert.match(script,/domain\.acceptContract\(campaign,contract\.id\)/);
 assert.match(script,/domain\.resolveOperation\(accepted,/);
 assert.match(script,/domain\.hireRecruit\(campaign\)/);
 assert.match(script,/domain\.readCampaign\(JSON\.stringify\(campaign\)\)/);
 assert.match(script,/localStorage\.setItem\(key,JSON\.stringify\(campaign\)\)/);
 assert.match(script,/await page\.reload\(\{waitUntil:'domcontentloaded'\}\)/);
 assert.match(script,/async function assessEstablishedCareer\(page,name,mobile\)/);
 assert.match(script,/async function assessActiveDeployment\(page,name,expected\)/);
 assert.match(script,/await assessEstablishedCareer\(page,name,mobile\)/);
 assert.match(script,/await assessActiveDeployment\(page,name,established\)/);
});
test('C9 checks restored full roster, lazy history, low stock and active mission guards',()=>{
 const script=readFileSync(new URL('../scripts/smoke-operations-room-responsive.mjs',import.meta.url),'utf8');
 for(const marker of [
  'full roster did not render','earlier records should be lazy before opening',
  'earlier history failed to load remaining two records',
  'exhausted reserves were not restored',
  'selected HQ resource is not identifiable','saved personnel milestones inaccessible',
  'active mission resume action missing',
  'squad slots editable during an active deployment',
  'accepting a contract altered recent operation history',
  'accepting a contract altered older operation access'
 ])assert.ok(script.includes(marker),'Missing C9 acceptance: '+marker);
});

test('C10 predeployment modal traps keyboard across all visible controls',()=>{
 const ui=source('campaign-ui.ts');
 const preflight=ui.slice(ui.indexOf(' private reviewContract(contract:Contract,campaign:CampaignState)'));
 assert.match(preflight,/const focusable=Array\.from\(panel\.querySelectorAll<HTMLElement>\(/);
 assert.match(preflight,/button:not\(:disabled\),summary,a\[href\],select:not\(:disabled\)/);
 assert.match(preflight,/\.filter\(el=>el\.getClientRects\(\)\.length>0\)/);
 assert.match(preflight,/if\(e\.shiftKey&&\(active===first\|\|!panel\.contains\(active\)\)\)/);
 assert.match(preflight,/else if\(!e\.shiftKey&&\(active===last\|\|!panel\.contains\(active\)\)\)/);
 assert.match(preflight,/panel\.insertBefore\(warnings,roster\)/);
 assert.match(preflight,/const fix=\(tab:'personnel'\|'logistics'\)=>/);
 assert.match(preflight,/this\.preparationContractId=contract\.id/);
 assert.match(preflight,/this\.handlers\.chooseContract\(contract\.id\)/);
});
test('C10 browser covers keyboard and return-to-case workflow on saved missions',()=>{
 const script=readFileSync(new URL('../scripts/smoke-operations-room-responsive.mjs',import.meta.url),'utf8');
 for(const marker of [
  'preflight forward Tab escaped interactive sheet',
  'preflight reverse Tab escaped interactive sheet',
  'preflight advisories buried after roster',
  'check logistics did not open Supply',
  'return-to-case did not restore briefing',
  'closing case review failed'
 ])assert.ok(script.includes(marker),'Missing predeployment acceptance: '+marker);
});

test('C11 campaign actions reuse save-aware feedback for squad, procurement and kit edits',()=>{
 const flow=source('breach-campaign-flow.ts');
 const helper=flow.slice(flow.indexOf('function applyVisibleCampaignAction('),
  flow.indexOf('const campaignScreen=new CampaignScreen('));
 assert.match(helper,/if\(after===before\)return/);
 assert.match(helper,/const saved=config\.saveCampaign\(\)/);
 assert.match(helper,/if\(saved\)showFieldworkActionFeedback\(message\)/);
 assert.match(helper,/else void showFieldworkNotice\('Save unavailable'/);
 const actions=flow.slice(flow.indexOf('assignSlot:(slot,id)=>'),
  flow.indexOf('equipWeaponPreset:(id,presetId)=>'));
 for(const [handler,mutator] of [
  ['assignSlot','assignOperatorToSlot'],
  ['buyWeapon','buyWeapon'],
  ['equipWeapon','equipCampaignWeapon'],
  ['repairArmor','repairCampaignArmor'],
  ['serviceWeapon','serviceCampaignWeapon'],
  ['equipGear','equipCampaignGear']
 ]){
  assert.ok(actions.includes(handler+':'),handler+' handler missing');
  assert.ok(actions.includes('c=>'+mutator+'(c,'),handler+' bypasses the saved-action helper');
 }
 assert.doesNotMatch(actions,/config\.saveCampaign\(\);showCampaignHome\(\)/);
});

test('C11 kit and attachment feedback never bypasses save-aware action handling',()=>{
 const flow=source('breach-campaign-flow.ts');
 const start=flow.indexOf('equipWeaponFamilyPart:(id,slot,partId)=>');
 const end=flow.indexOf('openStudio:(id)=>',start);
 assert.ok(start>=0&&end>start);
 const actions=flow.slice(start,end);
 for(const [handler,mutation] of [
  ['equipWeaponFamilyPart','equipCampaignWeaponFamilyPart'],
  ['equipAttachment','purchaseAndEquipWeaponAttachment'],
  ['moveMagazine','moveCampaignMagazine'],
  ['saveKitPreset','saveCampaignKitPreset'],
  ['applyKitPreset','applyCampaignKitPreset'],
  ['deleteKitPreset','deleteCampaignKitPreset'],
  ['renameOperator','renameCampaignOperator'],
  ['cycleAppearance','cycleCampaignAppearance'],
  ['setWardrobe','setCampaignWardrobe']
 ]){
  assert.ok(actions.includes(handler+':'),handler+' missing');
  assert.ok(actions.includes(mutation+'(c,'),handler+' no longer uses authoritative state');
 }
 assert.match(actions,/acquire\?'Attachment acquired and equipped':'Weapon attachment updated'/);
 assert.doesNotMatch(actions,/config\.saveCampaign\(\);showCampaignHome\(\)/);
});


test('C12: remaining weapon-preset and retirement edits use save-aware feedback',()=>{
 const flow=source('breach-campaign-flow.ts');
 const preset=flow.slice(flow.indexOf(' equipWeaponPreset:(id,presetId)=>'),
  flow.indexOf(' equipWeaponFamilyPart:(id,slot,partId)=>'));
 assert.match(preset,/equipWeaponPreset:\(id,presetId\)=>applyVisibleCampaignAction\(current=>/);
 assert.match(preset,/if\(current\.activeContractId\)return current/);
 assert.match(preset,/if\(!preset\|\|!member\)return current/);
 assert.match(preset,/return equipCampaignWeaponPreset\(next,id,presetId\)/);
 assert.match(preset,/Weapon family preset equipped/);
 assert.doesNotMatch(preset,/config\.saveCampaign\(\)|model\.campaign=next/);
 const retire=flow.slice(flow.indexOf(' retire:(id)=>{'),
  flow.indexOf(' importSave:(raw,slot)=>'));
 assert.match(retire,/window\.confirm\('Retire this operator from active service\?/);
 assert.match(retire,/applyVisibleCampaignAction\(c=>retireOperator\(c,id\)/);
 assert.match(retire,/Operator retired from active service/);
 assert.doesNotMatch(retire,/config\.saveCampaign\(\)|model\.campaign=retireOperator/);
});

test('C12: deployment is impossible when accepting a contract could not be saved',()=>{
 const flow=source('breach-campaign-flow.ts');
 const accept=flow.slice(flow.indexOf(' chooseContract:(id)=>{'),
  flow.indexOf(' resumeContract:()=>',flow.indexOf(' chooseContract:(id)=>{')));
 assert.match(accept,/const previous=model\.campaign/);
 assert.match(accept,/const next=acceptContract\(previous,id\)/);
 assert.match(accept,/if\(next===previous\)return/);
 assert.match(accept,/model\.campaign=next/);
 assert.match(accept,/if\(!config\.saveCampaign\(\)\)\{\s*model\.campaign=previous/);
 assert.match(accept,/showFieldworkNotice\('Save unavailable'/);
 assert.match(accept,/try again\.'\);\s*return;\s*\}\s*deployCampaignContract\(\)/);
 assert.equal((accept.match(/deployCampaignContract\(\)/g)??[]).length,1);
 assert.doesNotMatch(accept,/config\.saveCampaign\(\);deployCampaignContract\(\)/);
});
