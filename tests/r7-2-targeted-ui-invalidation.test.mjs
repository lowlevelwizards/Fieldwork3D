/** R7.2: quantified, semantically targeted DOM reconciliation acceptance. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {quickStateViewSignature,createTacticalSectionInvalidator}
 from '../src/ui/tactical-ui-invalidation.ts';
import {writeDomText,writeDomAttribute,writeDomStyle,writeDomHidden,
 writeDomDisabled,writeDomTitle,writeDomClass,writeDomOptionalAttribute,
 clearDomStyle} from '../src/ui/tactical-dom-reconciliation.ts';
import {measureR72,verifyR72,renderR72,instrumentedDomNode}
 from '../scripts/verification/r7-2-ui-evidence.mjs';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const model=(props={})=>({
 ownerId:'rook',nodeId:null,
 scope:'ROOK · HERE · NO ORDERS',scopeTitle:'Rook at current position',
 scopeAria:'Commands for Rook at current position',scopeKind:'operator',
 choices:[{id:'stance',label:'CROUCH',disabled:false,pressed:false},
  {id:'pace',label:'RUN',disabled:false,pressed:false}],...props
});
test('R7.2 200 no-change observations skip the button subtree, not visibility checks',()=>{
 const guard=createTacticalSectionInvalidator();
 const args={root:{},scope:{},session:{},signature:quickStateViewSignature(model())};
 for(let i=0;i<200;i++)assert.equal(guard.shouldReconcile(args),i===0);
 assert.deepEqual(guard.stats(),{attempts:200,reconciled:1,skipped:199});
});
test('R7.2 same-tick plan/stance, WATCH, operator, disabled and accessibility edits invalidate',()=>{
 const guard=createTacticalSectionInvalidator(),root={},scope={},session={};
 const update=view=>guard.shouldReconcile({
  root,scope,session,signature:quickStateViewSignature(view)
 });
 assert.equal(update(model()),true);
 const edits=[
  model({scope:'ROOK · HERE · 2 QUEUED'}),
  model({scopeKind:'watch',scopeAria:'Commands for Rook; WATCH selected'}),
  model({scope:'ROOK · WAYPOINT 02 · 2 QUEUED',scopeKind:'waypoint'}),
  model({scope:'MOSS · HERE · NO ORDERS',scopeTitle:'Moss here'}),
  model({ownerId:'moss'}), // identical callsign/labels; different selected actor
  model({nodeId:42}), // identical waypoint label; different authored node identity
  model({choices:[{id:'stance',label:'STAND',pressed:true,disabled:false}]}),
  model({choices:[{id:'stance',label:'CROUCH',pressed:false,disabled:true}]}),
  model({choices:[{id:'stance',label:'CROUCH',title:'New help'}]})
 ];
 for(const view of edits){
  assert.equal(update(view),true);
  assert.equal(update(view),false);
 }
 assert.deepEqual(guard.stats(),{attempts:19,reconciled:10,skipped:9});
 // JSON tuples cannot collide on user-entered delimiters.
 assert.notEqual(quickStateViewSignature(model({scope:'A|B'})),
  quickStateViewSignature(model({scope:'A',scopeTitle:'B'})));
});
test('R7.2 real context-action choices feed the signature, including authoring state',()=>{
 const settings={
  door:false,node:false,flashRemaining:1,posture:'stand',pace:'walk',
  firePolicy:'return',reserve:90,magazine:30,
  secondaryIssued:false,secondaryHand:'primary',
  secondaryReloadAvailable:false
 };
 const create=next=>quickStateViewSignature(model({
  choices:contextActionChoices({...settings,...next})
   .filter(choice=>choice.group==='state')
 }));
 const initial=create({});
 assert.equal(initial,create({}));
 assert.notEqual(initial,create({posture:'crouch'}));
 assert.notEqual(initial,create({pace:'run'}));
 assert.notEqual(initial,create({secondaryIssued:true,secondaryHand:'secondary'}));
});
test('R7.2 mounted surface and Session identity beat identical textual fingerprints',()=>{
 const guard=createTacticalSectionInvalidator();
 const root={},scope={},session={},signature=quickStateViewSignature(model());
 const view=(r=root,s=scope,ss=session)=>guard.shouldReconcile({
  root:r,scope:s,session:ss,signature
 });
 assert.equal(view(),true);
 assert.equal(view(),false);
 assert.equal(view({},scope,session),true,'new mounted quick-state strip');
 assert.equal(view(root,{},session),true,'new mounted scope');
 assert.equal(view(root,scope,{}),true,'new actual Session even with same seed/text');
 guard.invalidate(); // hidden/re-shown, replay or terminal-to-planning boundary
 assert.equal(view(),true,'returning from hidden must reconstruct visible values');
 assert.equal(view(),false);
});
test('R7.2 guarded DOM properties perform actual writes only for changed output',()=>{
 const {node,count}=instrumentedDomNode();
 for(let i=0;i<50;i++){
  writeDomText(node,'CROUCH');
  writeDomHidden(node,false);
  writeDomDisabled(node,true);
  writeDomTitle(node,'Operator');
  writeDomClass(node,'selected',true);
  writeDomAttribute(node,'aria-pressed','true');
  writeDomStyle(node,'--reload-progress','20%');
 }
 assert.deepEqual(Object.values(count),[1,1,1,1,1,1,0,1,0]);
 writeDomText(node,'STAND');writeDomDisabled(node,false);
 writeDomClass(node,'selected',false);
 writeDomOptionalAttribute(node,'aria-pressed',null);
 writeDomOptionalAttribute(node,'aria-pressed',null);
 clearDomStyle(node,'--reload-progress');
 clearDomStyle(node,'--reload-progress');
 assert.equal(count.text,2);
 assert.equal(count.disabled,2);
 assert.equal(count.classes,2);
 assert.equal(count.removedAttribute,1);
 assert.equal(count.removedStyle,1);
});
test('R7.2 measured workload is source-derived and reports no device performance claims',()=>{
 const report=measureR72();
 assert.equal(verifyR72(report),true);
 assert.equal(report.strip.skipped,199);
 assert.equal(report.guardedDom.firstPassCommittedWrites,7);
 assert.match(renderR72(report),/No FPS, CPU, layout, thermal or input-latency/);
});
test('R7.2 production boundary keeps live HUD, notice and GO running at original clock',()=>{
 const hud=file('src/ui/tactical-hud-controller.ts');
 const runtime=file('src/breach-runtime-loop.ts');
 const main=file('src/breach-main.ts');
 const quick=hud.slice(hud.indexOf('function renderQuickStates('),
  hud.indexOf('function renderTargetMode('));
 const session=hud.slice(hud.indexOf('function renderSession('),
  hud.indexOf('let weaponChooserBound=false;'));
 const guard=quick.indexOf('quickStateInvalidation.shouldReconcile(');
 assert.ok(quick.indexOf('writeDomHidden(quickStates,!shown)')<guard);
 assert.ok(quick.indexOf('hudHeight.sync(input.tacticalHud)')<guard);
 assert.ok(quick.indexOf("quickStateViewSignature({")<guard);
 assert.match(quick,/if\(!shown\|\|!actor\)\{quickStateInvalidation\.invalidate\(\);return;\}/);
 assert.match(quick,/plannedControl\(validWaypoint\?node\?\.id:undefined\)/);
 assert.match(quick,/selectAccessibleSecondaryMagazine/);
 assert.match(quick,/selectedActiveWatch/);
 assert.match(quick,/ownerId:actor\.id,nodeId:validWaypoint\?node\.id:null/);
 assert.match(session,/renderOperatorCard\(\{/);
 assert.match(session,/renderNotice\(ui\.feed/);
 assert.match(session,/renderGuidance\(\{/);
 assert.match(session,/renderMissionDebrief\(\{/);
 assert.match(session,/writeDomText\(ui\.mission/);
 assert.match(hud,/writeDomHidden\(stateLine,!status\.visible\)/);
 assert.match(hud,/writeDomClass\(button,'selected',id===selected\)/);
 assert.match(runtime,/const hudPeriod=state\.phase==='running'\?180:terminalHud\?750:120/);
 assert.match(runtime,/config\.observeSessionLifecycle\?\.\(\)/);
 assert.match(main,/function refreshTacticalUi\(\):void\{\s*observeSessionLifecycle\(\);\s*updateHud\(\);/);
 assert.match(main,/hudController\.renderSession\(\{/);
 assert.equal((runtime.match(/requestAnimationFrame\(tick\)/g)||[]).length,1);
});
test('R7.2 scope explicitly includes release gates and unchanged critical modes',()=>{
 const doc=file('docs/r7-2-targeted-ui-invalidation-scope-20261123.md');
 for(const token of ['R7.2.01','R7.2.08','120 ms','180 ms','750 ms',
  'same-tick','WATCH','replay','No FPS'])
  assert.ok(doc.includes(token),token);
 assert.match(doc,/exact-head/i,'release must require exact tested commit');
});
