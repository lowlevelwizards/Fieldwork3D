import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {RECOVERY_SOURCE_POLICY,UNKNOWN_RECOVERY_EVIDENCE,
 evaluateRecoveryProposal,shadowRecoveryDecision}
 from '../src/breach-recovery-adoption-contract.ts';
import {setRecoveryProposalObserver,hasRecoveryProposalObserver}
 from '../src/breach-recovery-shadow.ts';
import {setTransientRoute,prependTransientLeg,observeTransientPrepend,
 noteDoorHandoffRejection,setTransientRouteObserver}
 from '../src/breach-route-transition.ts';
import {inspectR0} from '../scripts/verification/movement-recovery-r0-audit.mjs';
import {verifyR1ShadowMotorParity}
 from '../scripts/verification/movement-recovery-r1-shadow-audit.mjs';

const p=(x,y)=>({x,y});
const pass={eligibility:'pass',clearance:'pass',cooldown:'pass',
 recurrence:'pass',progress:'pass'};
const proposal=(source='full-body-lane',overrides={})=>({
 source,operation:'replace',policy:RECOVERY_SOURCE_POLICY[source],
 actorId:'ash',orderId:10,orderKind:'move',authoredGoal:p(100,0),
 goalKey:'200:0',from:p(0,0),prior:[p(10,0)],
 next:[p(0,10),p(100,0)],seconds:6,blockedSeconds:2,
 blocker:'wall',owner:'none',doorId:null,retryRouteAt:0,
 lastRepairAt:1,recoveryAttempts:2,evidence:{...pass},
 ...overrides
});

test('R1 policy table covers exactly the current RouteSource union',()=>{
 const source=readFileSync(new URL('../src/breach-route-transition.ts',import.meta.url),'utf8');
 const union=source.match(/export type RouteSource=([\s\S]*?);/);
 assert.ok(union);
 const expected=[...union[1].matchAll(/'([^']+)'/g)].map(x=>x[1]).sort();
 assert.deepEqual(Object.keys(RECOVERY_SOURCE_POLICY).sort(),expected);
 for(const entry of Object.values(RECOVERY_SOURCE_POLICY)){
  assert.ok(entry.priority>=0&&entry.priority<=5);
  assert.ok(entry.family&&entry.intent&&entry.clearance&&entry.progress);
 }
});

test('R1 policy only conditionally accepts when all proofs are explicit',()=>{
 assert.deepEqual(evaluateRecoveryProposal(proposal()),{
  verdict:'would-adopt',reason:'eligible'});
 const unknown=proposal('full-body-lane',{
  evidence:{...UNKNOWN_RECOVERY_EVIDENCE}});
 assert.deepEqual(evaluateRecoveryProposal(unknown),{
  verdict:'requires-evidence',reason:'proof-missing'});
 assert.equal(shadowRecoveryDecision(unknown,'adopted').differsFromActual,false,
  'unknown is a review request, never fabricated disagreement');
});

test('R1 protects active motor ownership and cooldown, recurrence, progress',()=>{
 assert.deepEqual(evaluateRecoveryProposal(proposal('full-body-lane',{owner:'door'})),{
  verdict:'would-defer',reason:'protected-owner'});
 assert.deepEqual(evaluateRecoveryProposal(proposal('full-body-lane',{owner:'traversal'})),{
  verdict:'would-defer',reason:'protected-owner'});
 for(const [key,reason] of [
  ['cooldown','cooling-down'],['recurrence','route-recurrence'],
  ['progress','no-physical-progress']
 ]){
  assert.deepEqual(evaluateRecoveryProposal(proposal('full-body-lane',{
   evidence:{...pass,[key]:'fail'}})),{verdict:'would-defer',reason});
 }
 assert.deepEqual(evaluateRecoveryProposal(proposal('full-body-lane',{
  evidence:{...pass,clearance:'fail'}})),{
  verdict:'would-reject',reason:'physical-blocked'});
 assert.deepEqual(evaluateRecoveryProposal(proposal('full-body-lane',{
  evidence:{...pass,eligibility:'fail'}})),{
  verdict:'would-reject',reason:'ineligible'});
 assert.equal(evaluateRecoveryProposal(proposal(),11).reason,'stale-order');
 assert.equal(evaluateRecoveryProposal(proposal('full-body-lane',{
  next:[p(Infinity,0)]})).reason,'nonfinite-route');
 assert.equal(evaluateRecoveryProposal(proposal('full-body-lane',{
  next:[]})).reason,'empty-route');
});

test('R1 escape invalidation, normal route acquisition and passage retreat are exempt',()=>{
 assert.deepEqual(evaluateRecoveryProposal(proposal('door-leaf-escape',{
  next:[]})),{verdict:'exempt',reason:'special-transition'});
 assert.equal(evaluateRecoveryProposal(proposal('initial-portal-recovery')).verdict,
  'exempt');
 assert.equal(evaluateRecoveryProposal(proposal('generated-entry-settle')).verdict,
  'exempt');
 assert.equal(evaluateRecoveryProposal(proposal('passage-retreat')).verdict,
  'exempt');
 assert.equal(evaluateRecoveryProposal(proposal('door-handoff-reject')).verdict,
  'exempt');
});

test('R1 captures exactly adopted, observed-prepend and rejection-witness routes',()=>{
 const a={id:'rook',side:'red',p:p(1,2),nav:[p(10,10)],
  plan:[{kind:'move',id:10,p:p(100,0)}],routeGoalKey:'200:0',
  blockedTime:3,lastBlocker:'wall',retryRouteAt:5,
  lastNavRepairAt:1,recoveryAttempts:4,squeeze:false,
  traversal:null,traversalPending:false,doorTraversal:null};
 const s={seconds:6,doors:[]};
 const saved=structuredClone(a.plan);
 const events=[],legacy=[];
 try{
  setRecoveryProposalObserver(r=>events.push(r));
  setTransientRouteObserver(r=>legacy.push(r));
  assert.equal(hasRecoveryProposalObserver(),true);
  setTransientRoute(s,a,[p(20,0)],'full-body-lane');
  prependTransientLeg(s,a,p(4,5),'local-detour');
  observeTransientPrepend(s,a,p(2,3),'passage-retreat');
  noteDoorHandoffRejection(s,a,'not-ready');
 }finally{
  setRecoveryProposalObserver(null);
  setTransientRouteObserver(null);
 }
 assert.deepEqual(events.map(r=>r.actual),[
  'adopted','adopted','observed-prepend','rejection-witness']);
 assert.deepEqual(legacy.map(r=>r.source),[
  'full-body-lane','local-detour','passage-retreat','door-handoff-reject']);
 assert.equal(events[0].decision.verdict,'requires-evidence');
 assert.equal(events[0].proposal.blockedSeconds,3);
 assert.equal(events[0].proposal.recoveryAttempts,4);
 assert.equal(events[1].proposal.operation,'prepend');
 assert.deepEqual(events[1].proposal.next,[p(4,5),p(20,0)]);
 assert.deepEqual(events[2].proposal.next,[p(2,3),p(4,5),p(20,0)]);
 assert.equal(events[3].rejectionWitnessReason,'not-ready');
 assert.deepEqual(a.nav,[p(4,5),p(20,0)],
  'observed prepend and rejection witness do not edit route');
 assert.deepEqual(a.plan,saved,'no observer edits player orders');
 assert.equal(hasRecoveryProposalObserver(),false);
 setTransientRoute(s,a,[p(30,0)],'collision-world-replan');
 assert.equal(events.length,4,'opt-in witness must not leak between tests');
});

test('R1 snapshots cannot edit actor navigation or compromise motor on listener errors',()=>{
 const a={id:'ash',side:'red',p:p(0,0),nav:[p(10,0)],plan:[],
  routeGoalKey:'',blockedTime:0,lastBlocker:null,
  retryRouteAt:0,lastNavRepairAt:0,recoveryAttempts:0,
  traversal:null,traversalPending:false,doorTraversal:null};
 const s={seconds:1,doors:[]};
 try{
  setRecoveryProposalObserver(r=>{
   r.proposal.next[0].x=9999;
   r.proposal.prior[0].x=9999;
   throw Error('offline observer failed');
  });
  assert.doesNotThrow(()=>setTransientRoute(s,a,[p(50,0)],'initial-enemy'));
 }finally{setRecoveryProposalObserver(null);}
 assert.deepEqual(a.nav,[p(50,0)]);
 assert.deepEqual(a.p,p(0,0));
});

test('R1 R0 baseline writer inventory remains intact',()=>{
 const snapshot=inspectR0();
 assert.equal(snapshot.routeWriters.core,30);
 assert.equal(snapshot.routeWriters.extended,36);
 assert.equal(snapshot.scenarios.length,8);
});

test('R1 real production motor is identical with adoption shadow off and on',()=>{
 const result=verifyR1ShadowMotorParity(480);
 assert.equal(result.parity,true);
 assert.ok(result.events>0);
 assert.equal(result.disagreements>=0,true,
  'hypothetical disagreements are diagnostics, never movement gates');
});
