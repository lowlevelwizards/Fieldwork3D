import test from 'node:test';
import assert from 'node:assert/strict';
import {requestIndividualExtraction,commitIndividualExtractions,canConcludeWithdrawal,
 deriveOperationOutcome,deployedTeam} from '../src/breach-operation-outcomes.ts';
import {optionalIntelRecovered,advanceOptionalIntel}
 from '../src/breach-optional-intel.ts';
import {newSession,toggling,stepSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
const friend=(id,x,health=4)=>({
 id,name:id.toUpperCase(),side:'blue',health,p:{x,y:0},
 carriedById:null,carryingId:null,surrendered:false,plan:[],path:[]
});
const session=()=>({
 scenario:{extract:{x:100,y:0}},started:true,
 phase:'planning',mission:'clear',withdrawalRequested:true,
 withdrawalCompleted:false,extractedOperators:[],pendingExtractionIds:[],
 passageLeases:{},operators:[
  friend('rook',100),friend('moss',0),friend('ash',140,0)]
});
test('OC10 individual departure is GO-time, verified twice, and never a teleport',()=>{
 const s=session();
 assert.equal(requestIndividualExtraction(s,'rook'),true);
 assert.equal(s.extractedOperators.length,0,'click is intent, not extraction');
 assert.equal(requestIndividualExtraction(s,'rook'),false,'idempotent authoring');
 s.operators[0].p.x=0;
 s.phase='running';
 assert.equal(commitIndividualExtractions(s).length,0,
  'must recheck actual position on fixed tick');
 assert.equal(s.pendingExtractionIds.length,0,'stale orders are removed');
 s.phase='planning';s.operators[0].p.x=100;
 assert.equal(requestIndividualExtraction(s,'rook'),true);
 s.phase='running';
 const extracted=commitIndividualExtractions(s);
 assert.deepEqual(extracted.map(o=>o.id),['rook']);
 assert.equal(extracted[0].p.x,100,'body leaves only after reaching extraction');
 assert.ok(!s.operators.some(o=>o.id==='rook'),'retired from physical AI/motor list');
 assert.equal(s.extractedOperators.length,1);
 assert.equal(commitIndividualExtractions(s).length,0,'no repeated departure');
 assert.equal(canConcludeWithdrawal(s),false,'moss still alive and inside');
 s.operators.find(o=>o.id==='moss').p.x=100;
 assert.equal(canConcludeWithdrawal(s),true,'remaining mobile squad is ready');
});
test('OC10 downed/carrying actors cannot be individually extracted',()=>{
 const s=session();
 const rook=s.operators[0];
 rook.carryingId='ash';
 assert.equal(requestIndividualExtraction(s,'rook'),false,'release casualty first');
 rook.carryingId=null;
 assert.equal(requestIndividualExtraction(s,'ash'),false,'incapacitated body not mobile');
 s.withdrawalRequested=false;
 assert.equal(requestIndividualExtraction(s,'rook'),false,'not in extraction mode');
 s.withdrawalRequested=true;
 s.started=false;
 assert.equal(requestIndividualExtraction(s,'rook'),false,'before deployment');
});
test('OC10 retrospective result retains every operator and true left-behind casualty',()=>{
 const s=session();
 requestIndividualExtraction(s,'rook');
 s.phase='running';
 commitIndividualExtractions(s);
 s.phase='lost';s.withdrawalCompleted=true;
 const stats=deriveOperationOutcome(s);
 assert.equal(stats.disposition,'withdrawn');
 assert.deepEqual(stats.extractedOperatorIds,['rook']);
 assert.deepEqual(stats.evacuatedCasualtyIds,[]);
 assert.deepEqual(stats.leftBehindOperatorIds,['moss','ash']);
 assert.deepEqual(deployedTeam(s).map(o=>o.id),
  ['rook','moss','ash'],'debrief restores ordinary squad order');
 s.operators.find(o=>o.id==='moss').health=0;
 assert.equal(canConcludeWithdrawal(s),true,
  'the safe evacuated member survives when remaining squad is down');
});
test('OC10 optional evidence stays with an archived living courier, never drops',()=>{
 const s=session();
 const evidence={id:'note',kind:'documents',p:{x:0,y:0},roomId:'room1',
  discovered:true,collectedBy:'rook',collectedAt:2};
 s.phase='running';s.seconds=2;s.optionalIntel=[evidence];s.intelGather=null;
 s.scenario.extract={x:100,y:0};
 const liveBefore=optionalIntelRecovered(s);
 assert.equal(liveBefore.length,1);
 s.phase='planning';requestIndividualExtraction(s,'rook');s.phase='running';
 commitIndividualExtractions(s);
 assert.equal(advanceOptionalIntel(s,1/60,()=>true),null);
 assert.equal(evidence.collectedBy,'rook','archive is not a killed courier');
 assert.equal(optionalIntelRecovered(s).length,1,
  'physically carried evidence survives individual extraction');
});

test('OC10 actual 60 Hz mission tick retires an arrived squad member',()=>{
 const s=newSession(0,78219,'floor-plan','standard','clear');
 const rook=s.operators.find(a=>a.id==='rook');
 const at={...s.scenario.extract};
 rook.p={...at};rook.priorP={...at};rook.plan.length=0;rook.path.length=0;
 s.started=true;s.phase='planning';s.withdrawalRequested=true;
 assert.equal(requestIndividualExtraction(s,'rook'),true);
 toggling(s);
 stepSession(s,1/60);
 assert.equal(s.operators.some(a=>a.id==='rook'),false);
 assert.equal(s.extractedOperators.some(a=>a.id==='rook'),true);
 assert.deepEqual(s.extractedOperators.find(a=>a.id==='rook').p,at,
   'retired actor stays at the real gate; no off-map teleport');
 assert.equal(s.battleEvents.some(e=>e.meta?.action==='individual-extraction'),true,
   'authoritative fixed-step emits a real archival extraction event');
});

test('OC10 replay has the actor before extraction but not in later live frames',()=>{
 const s=newSession(0,78220,'floor-plan','standard','clear');
 const recorder=new MissionRecorder();
 recorder.capture(s,true);
 const rook=s.operators.find(a=>a.id==='rook');
 rook.p={...s.scenario.extract};rook.priorP={...s.scenario.extract};
 rook.plan.length=0;rook.path.length=0;
 s.started=true;s.phase='planning';s.withdrawalRequested=true;
 assert.equal(requestIndividualExtraction(s,'rook'),true);
 toggling(s);stepSession(s,1/60);
 recorder.capture(s,true);
 assert.equal(recorder.frames[0].actors.some(a=>a.id==='rook'),true,
  'the historical scene still has the member');
 assert.equal(recorder.frames.at(-1).actors.some(a=>a.id==='rook'),false,
  'later frames must not leave a ghost actor in the combat scene');
 assert.equal(s.extractedOperators.some(a=>a.id==='rook'),true,
  'the original full career record was archived separately');
});
