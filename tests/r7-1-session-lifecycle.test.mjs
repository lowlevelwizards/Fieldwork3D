/** R7.1 — lifecycle observations are separate from DOM and rendering. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBreachSessionLifecycleObserver}
 from '../src/breach-session-lifecycle-observer.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {newSession,team,toggling,stepSession,planMove}
 from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {createBreachAppFlow} from '../src/breach-app-flow.ts';

function synthetic(seed=711){
 return {site:{seed},phase:'planning',started:false,seconds:0,
  operators:[{side:'blue',id:'rook',p:{x:30,y:30},plan:[]}]} ;
}
function observer(){
 const phases=[],completed=[];
 const o=createBreachSessionLifecycleObserver({
  observePhase:phase=>phases.push(phase),
  recordCompletedOperation:()=>completed.push('recorded')
 });
 return {o,phases,completed};
}
function input(session,recorder,replaying=false){
 return {session,recorder,replaying};
}
test('R7.1 planning edits record every distinct same-tick journal revision independent of HUD',()=>{
 const {o,phases,completed}=observer();
 const s=synthetic(),recorder=new MissionRecorder();
 o.observe(input(s,recorder));
 assert.equal(recorder.plans.revisions.length,1,'initial empty authoring snapshot');
 s.operators[0].plan=[{id:1,kind:'move',p:{x:50,y:40}}];
 o.observe(input(s,recorder));
 s.operators[0].plan=[...s.operators[0].plan,
  {id:2,kind:'move',p:{x:65,y:44}}];
 o.observe(input(s,recorder));
 o.observe(input(s,recorder));
 assert.equal(recorder.plans.revisions.length,3,
  'same-tick changes survive, identical observation adds no revision');
 assert.deepEqual(recorder.plans.revisions.map(r=>r.tick),[0,0,0]);
 assert.deepEqual(recorder.plans.revisions.map(r=>r.nodes.length),[0,1,2]);
 assert.equal(recorder.plans.revisions[1].nodes[0].p.x,50,
  'later edits cannot mutate already recorded history');
 assert.deepEqual(phases,['planning'],'phase lifecycle is not refreshed every RAF');
 assert.equal(completed.length,0);
});
test('R7.1 exactly one receipt for a real started terminal Session identity',()=>{
 const {o,phases,completed}=observer();
 const s=synthetic(111),r=new MissionRecorder();
 o.observe(input(s,r));
 s.phase='running';s.started=true;
 o.observe(input(s,r));o.observe(input(s,r));
 assert.equal(completed.length,0,'running GO is not completion');
 s.phase='won';
 for(let i=0;i<24;i++)o.observe(input(s,r));
 assert.equal(completed.length,1,'no repeated Campaign or Quick Play receipt on HUD/RAF churn');
 assert.deepEqual(phases,['planning','running','won']);
 const newS=synthetic(111);
 newS.phase='won';newS.started=true;
 o.observe(input(newS,new MissionRecorder()));
 assert.equal(completed.length,2,'same seed is not the same Session');
 const notStarted=synthetic(112);
 notStarted.phase='won';
 o.observe(input(notStarted,new MissionRecorder()));
 assert.equal(completed.length,2,'a non-started terminal placeholder earns no receipt');
});
test('R7.1 entering replay never rewrites planning history or commits an imported result',()=>{
 const {o,phases,completed}=observer();
 const s=synthetic(),recorder=new MissionRecorder();
 o.observe(input(s,recorder));
 const before=recorder.plans.revisions.length;
 s.operators[0].plan=[{id:19,kind:'move',p:{x:44,y:35}}];
 s.started=true;s.phase='won';
 for(let i=0;i<12;i++)o.observe(input(s,recorder,true));
 assert.equal(recorder.plans.revisions.length,before);
 assert.equal(completed.length,0);
 assert.deepEqual(phases,['planning']);
 o.observe(input(s,recorder));
 assert.equal(completed.length,1,'only restored live Session may be finalized');
 assert.deepEqual(phases,['planning','won'],'replay exit re-observes same phase');
});
test('R7.1 observes actual app-flow phase separately from a render request',()=>{
 const flow=createBreachAppFlow('quick');
 const s=synthetic(119),r=new MissionRecorder();
 const o=createBreachSessionLifecycleObserver({
  observePhase:phase=>flow.observePhase(phase),
  recordCompletedOperation:()=>{}
 });
 o.observe(input(s,r));
 assert.equal(flow.surface,'tactical');
 s.phase='running';s.started=true;
 o.observe(input(s,r));
 assert.equal(flow.surface,'tactical');
 s.phase='lost';
 o.observe(input(s,r));
 assert.equal(flow.surface,'debrief');
});
const site=()=>({
 seed:7101,name:'R7.1 real fixed GO',layout:'corridor',
 rooms:[{id:'room',x:80,y:140,w:460,h:180,kind:'room',purpose:'floor',tone:1}],
 roomCount:1,walls:[],cover:[],doors:[],windows:[],
 enemies:[{x:460,y:270}],spawn:[{x:280,y:200},{x:280,y:230},
  {x:280,y:260},{x:280,y:290}],
 entrance:{x:270,y:200},objective:{x:100,y:200},extract:{x:530,y:200},
 bounds:{minX:0,minY:0,maxX:640,maxY:740}
});
test('R7.1 authentic 60Hz GO retains pre-execution plan evidence and independent terminal notification',()=>{
 const s=newSession(0,7101,'full-view','small','hold',site());
 const recorder=new MissionRecorder(),a=team(s)[0];
 const {o,completed,phases}=observer();
 try{
  recorder.capture(s,true);
  o.observe(input(s,recorder));
  assert.equal(planMove(s,a.id,{x:340,y:200}),true,'real authored move is legal');
  o.observe(input(s,recorder));
  const planRevision=recorder.plans.revisions.at(-1);
  assert.ok(planRevision.nodes.some(n=>n.kind==='move'));
  assert.equal(planRevision.phase,'planning');
  // Real before-GO recorder capture, as performed by MissionController.
  recorder.capture(s,true);
  toggling(s);
  assert.equal(s.phase,'running');
  stepSession(s,1/60);
  recorder.capture(s,false);
  o.observe(input(s,recorder));
  assert.ok(s.seconds>0,'real stepSession advanced the only simulation clock');
  assert.equal(completed.length,0,'live running state must not grant a result');
  assert.ok(phases.includes('running'));
  // Force terminal state only to isolate observer dispatch; winner detection
  // itself belongs to the existing operation-outcome tests, not R7.1.
  s.phase='won';s.started=true;
  o.observe(input(s,recorder));
  o.observe(input(s,recorder));
  assert.equal(completed.length,1);
  assert.ok(recorder.plans.revisions.some(revision=>revision.nodes.length>0));
 }finally{activateSite(null);}
});
test('R7.1 HUD no longer owns phase, planning, or Campaign completion side effects',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
 const hud=main.slice(main.indexOf('function updateHud(){'),
  main.indexOf('function refreshTacticalUi():void'));
 assert.ok(hud.includes('hudController.renderSession('));
 assert.doesNotMatch(hud,/\b(?:capturePlanning|recordCompletedOperation|observePhase|observeSessionLifecycle)\s*\(/);
 assert.match(main,/function refreshTacticalUi\(\):void\{\s*observeSessionLifecycle\(\);\s*updateHud\(\);/);
 assert.match(main,/updateHud,observeSessionLifecycle,updateReplayHud/);
 assert.match(main,/captureBeforeExecution:\(\)=>missionController\.captureBeforeExecution\(state,recorder\)/);
 const tick=runtime.indexOf('stepSession(state,1/60');
 const recorder=runtime.indexOf('recorder.capture(state,config.isMissionTerminal(state))');
 const notified=runtime.indexOf('config.observeSessionLifecycle?.()');
 const repaint=runtime.indexOf('config.updateHud();');
 assert.ok(tick>=0&&tick<recorder&&recorder<notified&&notified<repaint,
  'real GO and recorder precede independent lifecycle; scheduled HUD paints later');
 assert.match(runtime,/const hudPeriod=state\.phase==='running'\?180:terminalHud\?750:120/);
 assert.equal((runtime.match(/requestAnimationFrame\(tick\)/g)||[]).length,1);
});
