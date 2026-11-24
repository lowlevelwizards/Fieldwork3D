/** R7.0: source-located UI orchestration census. Evidence only.
 * Reuses E0's priority inventory and C0's scene/presentation owners.
 * Does not import browser runtime or modify UI, saves, Session, replay or CSS.
 * node scripts/verification/r7-0-ui-orchestration-audit.mjs --check --out artifacts/refactor-r7-0
 */
import assert from 'node:assert/strict';
import ts from 'typescript';
import {createHash} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {C0_OWNERS,inspectC0,verifyC0} from './package-c0-presentation-audit.mjs';
import {E0_AREAS} from './refactor-e0-audit.mjs';

const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
export const R70_BASE='e73221724fdf4f73cfbd971a50cad8c1e63506d8';
export const R70_STAGES=Object.freeze([
 {id:'R7.1',name:'Split lifecycle bookkeeping from HUD refresh',owner:'src/breach-main.ts',risk:'high',metric:'single completion receipt and planning snapshots on exact 60-Hz replayable steps'},
 {id:'R7.2',name:'Targeted UI invalidation with measured DOM writes',owner:'src/ui/tactical-hud-controller.ts',risk:'medium-high',metric:'changed DOM writes, input latency, fresh WATCH/target/notice states'},
 {id:'R7.3',name:'Shared equipment workspace orchestration',owner:'src/ui/equipment-workspace.ts',risk:'medium-high',metric:'identical Campaign/Quick Play selections, valid authority, bounded preview lifetime'},
 {id:'R7.4',name:'Bounded Campaign view controllers',owner:'src/campaign-ui.ts',risk:'medium',metric:'focus, back, scroll, operator and armory state parity'},
 {id:'R7.5',name:'Integration and selective subtraction',owner:'src/breach-main.ts',risk:'high',metric:'exact-head CI, browser comparison, prior + new Pages stamp'}
]);
export const R70_OWNERS=Object.freeze([
 {id:'composition',path:'src/breach-main.ts',authority:'composition',role:'UI refresh graph, Session mounting and replay/mission view coordination',markers:['function updateHud(', 'function releaseMissionPresentation(']},
 {id:'lifecycle',path:'src/breach-session-lifecycle-observer.ts',authority:'session-notifications',role:'Phase, planning journal and terminal receipt adapter',markers:['export function createBreachSessionLifecycleObserver(', 'recorder.capturePlanning(session)']},
 {id:'frame',path:'src/breach-runtime-loop.ts',authority:'frame-clock',role:'One RAF, one fixed 60-Hz simulation step, scheduled UI notification',markers:['createBreachRuntimeLoop','hudPeriod=']},
 {id:'mission',path:'src/breach-mission-controller.ts',authority:'session-lifetime',role:'Session creation/transition/recording handoff',markers:['class BreachMissionController']},
 {id:'game',path:'src/breach-game.ts',authority:'simulation',role:'Session and order execution',markers:['export function newSession(', 'export function stepSession(']},
 {id:'recorder',path:'src/breach-replay.ts',authority:'replay-record',role:'Historical event/snapshot capture',markers:['class MissionRecorder']},
 {id:'hud',path:'src/ui/tactical-hud-controller.ts',authority:'tactical-display',role:'Read-only HUD, command binding and ephemeral feedback',markers:['createTacticalHudController','function renderSession(']},
 {id:'notices',path:'src/ui/execution-feedback.ts',authority:'notice-display',role:'Player-visible scoped notice lifecycle',markers:['class ExecutionNoticeFeed']},
 {id:'dom',path:'src/ui/tactical-dom-reconciliation.ts',authority:'dom-writes',role:'DOM equality guards, no cache or gameplay scheduling',markers:['export function writeDomText(']},
 {id:'quick-strip-invalidation',path:'src/ui/tactical-ui-invalidation.ts',authority:'presentation-invalidation',role:'Scoped semantic view signature and mounted view invalidation; no Session mutations or timers',markers:['export function quickStateViewSignature(', 'export function createTacticalSectionInvalidator(']},
 {id:'campaign-view',path:'src/campaign-ui.ts',authority:'campaign-display',role:'Campaign navigation, roster, contract, armory and preview view state',markers:['export class CampaignScreen','private disposePreview()']},
 {id:'campaign-home-continuity',path:'src/ui/campaign/home-view-continuity.ts',authority:'campaign-home-refresh',role:'UI-only scroll, focus and keyed disclosure restoration',markers:['export function captureCampaignHomeView(', 'export function restoreCampaignHomeView(']},
 {id:'campaign-home-tabs',path:'src/ui/campaign/home-tabs.ts',authority:'campaign-tab-display',role:'Mounted panels, keyboard and ARIA navigation',markers:['export function createCampaignHomeTabs(']},
 {id:'campaign-landing-navigation',path:'src/ui/campaign/landing-navigation.ts',authority:'campaign-landing-display',role:'Local menu subpage, back and focus',markers:['export function createCampaignLandingNavigation(']},
 {id:'campaign-personnel',path:'src/ui/campaign/personnel-view.ts',authority:'campaign-personnel-display',role:'Snapshot presentation and injected action/selection ports',markers:['export function renderCampaignPersonnel(']},
 {id:'campaign-logistics',path:'src/ui/campaign/logistics-view.ts',authority:'campaign-logistics-display',role:'Snapshot presentation and injected action/selection ports',markers:['export function renderCampaignLogistics(']},
 {id:'campaign-cases',path:'src/ui/campaign/cases-view.ts',authority:'campaign-cases-display',role:'Snapshot presentation and injected action/selection ports',markers:['export function renderCampaignCases(']},
 {id:'campaign-chronicle',path:'src/ui/campaign/chronicle-view.ts',authority:'campaign-chronicle-display',role:'Snapshot presentation and injected action/selection ports',markers:['export function renderCampaignChronicle(']},
 {id:'campaign-flow',path:'src/breach-campaign-flow.ts',authority:'campaign-actions',role:'Application transaction coordination and save feedback',markers:['createBreachCampaignFlow','function applyVisibleCampaignAction(']},
 {id:'campaign-domain',path:'src/campaign-state.ts',authority:'campaign-state',role:'Persistent campaign/economy/mission result functions',markers:['export function readCampaign(', 'export function resolveOperation(']},
 {id:'quick-ops',path:'src/breach-operations-board-controller.ts',authority:'quick-ops-view',role:'Quick Play operations/loadout board presentation and lifecycle',markers:['createBreachOperationsBoardController','function renderOperationsBoard(']},
 {id:'quick-creator',path:'src/ui/quick-play-configurator.ts',authority:'quick-creator-view',role:'Scenario creator, squad prep, in-mission UI-only state',markers:['createQuickPlayConfigurator','function render()']},
 {id:'equipment-workspace',path:'src/ui/equipment-workspace.ts',authority:'equipment-view-lifetime',role:'Per-surface gallery memory, generation and preview mount retirement; no stock/roster authority',markers:['export function createEquipmentWorkspace(', 'function mountGallery(', 'function mountPreview(', 'function deferPreviewMount(']},
 {id:'outfitter',path:'src/ui/campaign-outfitter-gallery.ts',authority:'shared-equipment-view',role:'Shared horizontal gallery, lazy thumbs, cancellation, UI scroll state',markers:['export function createOutfitterGallery(', 'thumbnailGeneration++']},
 {id:'field-kit',path:'src/ui/field-gadget-editor.ts',authority:'shared-kit-view',role:'Mode-independent field-inventory editor, no stock authority',markers:['export function createFieldGadgetEditor(']},
 {id:'squad-rail',path:'src/ui/loadout-squad-rail.ts',authority:'shared-squad-view',role:'Preparation operator selection component',markers:['export function createLoadoutSquadRail(']},
 {id:'kit-preview',path:'src/equipment-preview.ts',authority:'preview-gpu',role:'CampaignKitPreview rendering and thumbnail resource lifetime',markers:['export class CampaignKitPreview']}
]);
export const R70_MODES=Object.freeze({
 'Planning/Tactical 2D or 3D':['composition','lifecycle','frame','mission','game','recorder','hud','notices','dom','quick-strip-invalidation'],
 'Running GO':['composition','lifecycle','frame','game','recorder','hud','notices','dom'],
 'Replay/After Action':['composition','lifecycle','frame','recorder','hud','notices','dom'],
 'Campaign Home':['campaign-view','campaign-home-continuity','campaign-home-tabs','campaign-landing-navigation','campaign-personnel','campaign-logistics','campaign-cases','campaign-chronicle','campaign-flow','campaign-domain'],
 'Campaign Armory':['campaign-view','campaign-flow','campaign-domain','equipment-workspace','outfitter','field-kit','squad-rail','kit-preview'],
 'Quick Play Operations':['composition','quick-ops','equipment-workspace','outfitter','field-kit','squad-rail','kit-preview'],
 'Quick Play Creator':['quick-creator','equipment-workspace','outfitter','field-kit','squad-rail','kit-preview']
});
const SIGNALS=Object.freeze({
 refresh:['updateHud','refreshHud','renderSession','renderQuickStates','quickStateViewSignature','renderOperationsBoard','renderSquadPrep','updateContext','updateReplayHud','syncBriefingCard','syncMissionPhase','syncNextSiteControls','syncSavedButtons','showCampaignHome'],
 bookkeeping:['capturePlanning','recordCompletedOperation','observeSessionLifecycle','resolveOperation','saveCampaign','stepSession','applyVisibleCampaignAction'],
 shared:['renderCampaignPersonnel','renderCampaignLogistics','renderCampaignCases','renderCampaignChronicle','captureCampaignHomeView','restoreCampaignHomeView','createCampaignHomeTabs','createCampaignLandingNavigation','createOutfitterGallery','createGallery','mountGallery','mountPreview','deferPreviewMount','createFieldGadgetEditor','createLoadoutSquadRail','renderModelThumbnail','renderModelThumbnailAsync'],
 lifetime:['dispose','disconnect','remove','cancelAnimationFrame','releaseMissionPresentation','mountMissionSession','resetNotices','requestAnimationFrame'],
 interaction:['addEventListener','removeEventListener','focus','renderNotice','reset','show','hide'],
 dom:['append','replaceChildren','setAttribute','removeAttribute']
});
const SIGNAL_CATEGORY=new Map(Object.entries(SIGNALS).flatMap(([category,names])=>
 names.map(name=>[name,category])));
export const R70_EDGES=Object.freeze([
 ['src/breach-main.ts','renderSession'],['src/breach-main.ts','observeSessionLifecycle'],
 ['src/breach-session-lifecycle-observer.ts','capturePlanning'],
 ['src/breach-session-lifecycle-observer.ts','recordCompletedOperation'],
 ['src/breach-runtime-loop.ts','observeSessionLifecycle'],
 ['src/breach-runtime-loop.ts','updateHud'],
 ['src/ui/tactical-hud-controller.ts','quickStateViewSignature'],
 ['src/breach-operations-board-controller.ts','renderOperationsBoard'],
 ['src/ui/quick-play-configurator.ts','renderSquadPrep'],
 ['src/campaign-ui.ts','renderCampaignPersonnel'],
 ['src/campaign-ui.ts','renderCampaignLogistics'],
 ['src/campaign-ui.ts','renderCampaignCases'],
 ['src/campaign-ui.ts','renderCampaignChronicle'],
 ['src/campaign-ui.ts','captureCampaignHomeView'],['src/campaign-ui.ts','restoreCampaignHomeView'],
 ['src/campaign-ui.ts','createCampaignHomeTabs'],['src/campaign-ui.ts','createCampaignLandingNavigation'],
 ['src/campaign-ui.ts','mountGallery'],
 ['src/breach-operations-board-controller.ts','mountGallery'],
 ['src/ui/quick-play-configurator.ts','mountGallery'],
 ['src/ui/equipment-workspace.ts','createGallery'],
 ['src/campaign-ui.ts','mountPreview'],
 ['src/breach-operations-board-controller.ts','mountPreview'],
 ['src/ui/quick-play-configurator.ts','mountPreview'],
 ['src/breach-operations-board-controller.ts','deferPreviewMount'],
 ['src/ui/campaign-outfitter-gallery.ts','disconnect'],
 ['src/ui/campaign-outfitter-gallery.ts','cancelAnimationFrame'],
 ['src/breach-main.ts','resetNotices']
]);
const callerOf=node=>{
 for(let p=node.parent;p;p=p.parent){
  if(ts.isFunctionDeclaration(p)&&p.name)return p.name.text;
  if(ts.isMethodDeclaration(p)&&p.name)return p.name.getText();
  if(ts.isConstructorDeclaration(p))return 'constructor';
  if((ts.isArrowFunction(p)||ts.isFunctionExpression(p))&&p.parent){
   if(ts.isVariableDeclaration(p.parent)&&p.parent.name)return p.parent.name.getText();
   if(ts.isPropertyAssignment(p.parent))return p.parent.name.getText();
  }
 }
 return '(module or anonymous callback)';
};
/** AST observations: only actual calls, not comments or strings.
 * A source call site is NOT a runtime call count or evidence of a redundant write.
 */
export function sourceUiSignals(source,path='fixture.ts'){
 const ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 const rows=[];
 const visit=node=>{
  if(ts.isCallExpression(node)){
   const expression=node.expression;
   const callee=ts.isIdentifier(expression)?expression.text:
    ts.isPropertyAccessExpression(expression)?expression.name.text:null;
   const category=SIGNAL_CATEGORY.get(callee);
   if(category){
    const loc=ast.getLineAndCharacterOfPosition(node.getStart(ast));
    rows.push({category,callee,line:loc.line+1,caller:callerOf(node),
     expression:expression.getText(ast).slice(0,100)});
   }
  }
  ts.forEachChild(node,visit);
 };
 visit(ast);
 return rows;
}
const read=(root,path)=>readFileSync(join(root,path),'utf8');
const hash=source=>createHash('sha256').update(source).digest('hex');
const head=root=>{try{return execFileSync('git',['rev-parse','HEAD'],
 {cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();}
 catch{return null;}};
const site=(rows,callee)=>rows.filter(x=>x.callee===callee);
export function inspectR70(root=ROOT){
 const c0=inspectC0(root);
 verifyC0(c0);
 const existing=new Set(Object.values(C0_OWNERS).map(x=>x.owner));
 const owners=[],byPath=new Map(),problems=[];
 for(const owner of R70_OWNERS){
  if(!existsSync(join(root,owner.path))){problems.push('Missing UI owner: '+owner.path);continue;}
  const source=read(root,owner.path),rows=sourceUiSignals(source,owner.path);
  const markers=owner.markers.map(marker=>({marker,found:source.includes(marker)}));
  for(const check of markers)if(!check.found)
   problems.push('Missing '+owner.id+' entrypoint: '+check.marker+' in '+owner.path);
  const counts=Object.fromEntries(Object.keys(SIGNALS).map(category=>
   [category,rows.filter(x=>x.category===category).length]));
  const evidence=Object.fromEntries(Object.keys(SIGNALS).map(category=>
   [category,rows.filter(x=>x.category===category).slice(0,18)]));
  owners.push({...owner,lines:source.split(/\r?\n/).length,bytes:Buffer.byteLength(source),
   hash:hash(source),counts,evidence,markers,c0Owner:existing.has(owner.path)});
  byPath.set(owner.path,{source,rows});
 }
 for(const [path,callee] of R70_EDGES){
  if(!site(byPath.get(path)?.rows??[],callee).length)
   problems.push('Missing UI refresh/lifecycle edge: '+path+' -> '+callee);
 }
 if(!E0_AREAS.some(x=>x.id==='E0.04'))
  problems.push('E0.04 UI audit baseline no longer available');
 for(const [mode,ids] of Object.entries(R70_MODES))
  for(const id of ids)
   if(!R70_OWNERS.some(x=>x.id===id))problems.push('Unknown mode owner '+mode+': '+id);
 const refresh={
  cadence:{file:'src/breach-runtime-loop.ts',scheduledMs:
   {planning:120,running:180,terminal:750},
   observed:/hudPeriod=state\.phase===.running.\?180:terminalHud\?750:120/.test(
    byPath.get('src/breach-runtime-loop.ts')?.source??''),
   caveat:'Clock expression observed in source, not instrumented/browser-measured execution frequency'},
  entrypoints:R70_EDGES.map(([path,callee])=>({
   path,callee,sites:site(byPath.get(path)?.rows??[],callee)})),
  orchestratorCalls:(byPath.get('src/breach-main.ts')?.rows??[])
   .filter(x=>['renderSession','observeSessionLifecycle','updateHud',
    'syncBriefingCard','syncMissionPhase','syncNextSiteControls',
    'syncSavedButtons','renderQuickStates'].includes(x.callee)),
  caveat:'AST callsites cannot prove runtime invocation rate, DOM writes, or safe removal.'
 };
 if(!refresh.cadence.observed)problems.push('HUD cadence semantics have drifted');
 const equipment={
  surfaces:[
   {mode:'Campaign armory',owner:'campaign-view',policy:'finite paid stock, persistence and issued equipment'},
   {mode:'Quick Play operations',owner:'quick-ops',policy:'roster modifications without Campaign purchase rules'},
   {mode:'Quick Play creator squad prep',owner:'quick-creator',policy:'scenario-local preparation; live tactical Session stays mounted'}
  ],
  sharedComponents:['equipment-workspace','outfitter','field-kit','squad-rail','kit-preview'],
  galleryCallers:['src/campaign-ui.ts','src/breach-operations-board-controller.ts',
   'src/ui/quick-play-configurator.ts'].map(path=>({
    path,sites:site(byPath.get(path)?.rows??[],'mountGallery')})),
  caveat:'Shared component calls are existing reuse, not proof the three orchestration policies are identical.'
 };
 const lifecycle={
  files:['src/campaign-ui.ts','src/breach-operations-board-controller.ts',
   'src/ui/quick-play-configurator.ts','src/ui/campaign-outfitter-gallery.ts',
   'src/ui/equipment-workspace.ts','src/equipment-preview.ts'].map(path=>{
    const rows=byPath.get(path)?.rows??[];
    return {path,observed:rows.filter(x=>x.category==='lifetime').slice(0,40),
     total:rows.filter(x=>x.category==='lifetime').length};
   }),
  note:'Source-level disposal and async-generation guards are not heap, GPU or leak measurements.'
 };
 const output={schema:1,stage:'R7.0',readOnly:true,base:R70_BASE,head:head(root),
  sources:owners.length,c0:{owners:c0.keyModules.length,checks:Object.keys(c0.checks).length},
  e0Area:'E0.04',owners,modes:R70_MODES,refresh,equipment,lifecycle,
  stages:R70_STAGES,problems,limits:[
   'No runtime/UI/CSS/serialization/source-code change in R7.0',
   'AST call sites are syntactic, not executed frame counts, DOM writes, or input latency',
   'The existing C0 scene ownership matrix is reused, not replaced',
   'R7.1–R7.5 behavior and performance gates must be run after their own code changes'
  ]};
 return output;
}
export function verifyR70(r){
 assert.equal(r.schema,1);
 assert.equal(r.stage,'R7.0');
 assert.equal(r.readOnly,true,'R7.0 must remain read-only');
 assert.equal(r.base.length,40);
 assert.equal(r.sources,R70_OWNERS.length,'Missing owner evidence');
 assert.ok(r.c0.owners>=19,'Expected inherited C0 presentation owners');
 assert.ok(r.refresh.cadence.observed,'Missing source 120/180/750ms scheduling contract');
 assert.deepEqual(r.problems,[],r.problems.join('; '));
 assert.equal(r.stages.length,5);
 for(const owner of r.owners)assert.ok(owner.hash.length===64&&owner.lines>5);
 return true;
}
export function formatR70(r){
 const rows=r.owners.map(o=>'| '+o.id+' | '+o.path+' | '+o.authority+
  ' | '+o.lines+' | '+o.counts.refresh+' | '+o.counts.lifetime+' |');
 const edges=r.refresh.entrypoints.flatMap(e=>e.sites.slice(0,8).map(s=>
  '| '+e.path+':'+s.line+' | '+s.caller+' | '+s.expression+' |'));
 const shared=r.equipment.galleryCallers.map(e=>
  '- '+e.path+': '+e.sites.map(x=>x.line).join(', '));
 const life=r.lifecycle.files.flatMap(f=>f.observed.slice(0,12).map(s=>
  '| '+f.path+':'+s.line+' | '+s.caller+' | '+s.expression+' |'));
 return [
  '# R7.0 — UI Orchestration and Equipment Workspace Evidence','',
  '**Read-only:** yes. Base '+r.base+'; inspected head '+(r.head??'source archive')+'.',
  'C0 reused: '+r.c0.owners+' canonical presentation owners / '+r.c0.checks+' checks.',
  'E0 reused: '+r.e0Area+'.','',
  '## Canonical UI owners and observed AST callsites','',
  '| Domain | Source | Authority | LOC | Refresh callsites | Lifetime callsites |',
  '|---|---|---|---:|---:|---:|',...rows,'',
  '## Source-located refresh/recording and lifecycle crossings','',
  '| Callsite | Enclosing owner | Expression |','|---|---|---|',...edges,'',
  'Scheduled refresh: planning 120ms, running 180ms, terminal 750ms;',
  'immediate event updates are a distinct source. No runtime frequency measured.','',
  '## Shared equipment gallery callers','',...shared,'',
  'Campaign has stock, purchases, issuance and saves; Quick Play has separate',
  'roster/creator policies. The gallery and field-kit editor are already shared.','',
  '## Source-level disposal and async thumbnail evidence','',
  '| Source:line | Enclosing owner | Call |','|---|---|---|',...life,'',
  'The existing gallery already uses a cancellation generation, RAF retirement',
  'and an observer disconnect. No unmeasured leak, FPS or DOM benefit is claimed.','',
  '## Next implementation gates','',
  '| Stage | Scoped responsibility | Risk | Required demonstration |',
  '|---|---|---|---|',
  ...r.stages.map(s=>'| '+s.id+' | '+s.name+' | '+s.risk+' | '+s.metric+' |'),'',
  '## Protected implementation constraints','',
  ...r.limits.map(x=>'- '+x),
  '- For all future phases: preserve WATCH/selection, replay historical knowledge,',
  '  operator preview/thumbnail lifetime, Campaign stock atomicity and 60-Hz execution.',
  '- Before any R7.2 optimization: instrument real before/after DOM writes, input',
  '  latency, presentation CPU and retained renderer resources in real browser.',
  '- For each implementation PR: exact-head gates, prior Pages state and served',
  '  post-merge build stamp must be verified.','',
  'Audit problems: '+r.problems.length+'.',''
 ].join('\n');
}
export function writeR70(r,out){
 mkdirSync(out,{recursive:true});
 const json=(name,data)=>writeFileSync(join(out,name),JSON.stringify(data,null,2)+'\n');
 json('audit.json',{...r,owners:r.owners.map(({evidence,...rest})=>rest)});
 json('ownership.json',{base:r.base,head:r.head,c0:r.c0,modes:r.modes,
  owners:r.owners.map(({evidence,...rest})=>rest)});
 json('refresh.json',r.refresh);
 json('equipment.json',r.equipment);
 json('lifecycle.json',r.lifecycle);
 writeFileSync(join(out,'handoff.md'),formatR70(r));
}
const invoked=process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invoked){
 const report=inspectR70();
 if(process.argv.includes('--check'))verifyR70(report);
 const i=process.argv.indexOf('--out');
 if(i>=0){
  assert.ok(process.argv[i+1]&&!process.argv[i+1].startsWith('--'),'Missing --out path');
  writeR70(report,resolve(process.argv[i+1]));
 }
 console.log('R7.0 read-only '+JSON.stringify({head:report.head,
  owners:report.owners.length,c0:report.c0,refreshEdges:report.refresh.entrypoints.length,
  problems:report.problems}));
}
