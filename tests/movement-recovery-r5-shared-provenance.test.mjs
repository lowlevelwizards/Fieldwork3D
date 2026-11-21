import test from 'node:test';
import assert from 'node:assert/strict';
import {finiteRecoveryPoint,finiteRecoveryRoute,recoveryDistance,
 makeRecoveryProposal,recordAdoptionWitness,readAdoptionWitness}
 from '../src/breach-recovery-adoption-shared.ts';
import {ordinaryRecoveryProgress,evaluateOrdinaryRecoveryAdoption}
 from '../src/breach-ordinary-recovery-adoption.ts';
import {acquisitionProgress,authorizeRouteAcquisition}
 from '../src/breach-route-acquisition-adoption.ts';
import {evaluateSpecialistRecoveryAdoption}
 from '../src/breach-specialist-recovery-adoption.ts';
import {RECOVERY_SOURCE_POLICY}
 from '../src/breach-recovery-adoption-contract.ts';
import {inspectR0,R0_CORE_ORIGINAL_LINES,R2_REVIEWED_WRITER_LINES,
 R3_REVIEWED_ROUTE_WRITER_LINES}
 from '../scripts/verification/movement-recovery-r0-audit.mjs';
import {verifyR1ShadowMotorParity}
 from '../scripts/verification/movement-recovery-r1-shadow-audit.mjs';

const p=(x,y)=>({x,y});
const actor=()=>({
 id:'rook',side:'blue',p:p(0,0),nav:[p(12,0)],
 plan:[{kind:'move',id:42,p:p(100,0)}],
 routeGoalKey:'200:0',blockedTime:2,recoveryAttempts:2,
 lastBlocker:'wall',lastNavRepairAt:0,
 lastNormalLaneProbeAt:5,retryRouteAt:0,
 doorTraversal:null,traversal:null,traversalPending:false,
 squeeze:false,autoSidestep:null,fireRetreatTarget:null
});
const session=()=>({seconds:5,doors:[]});
const evidence=()=>({
 eligibility:'pass',clearance:'pass',cooldown:'pass',
 recurrence:'pass',progress:'pass'
});

test('R5 shared proposal builder exactly preserves R1 actor/order/door envelope',()=>{
 const a=actor(),s=session(),route=[p(5,8),p(100,0)];
 const policy=RECOVERY_SOURCE_POLICY['full-body-lane'];
 const first=evidence();
 const opts={source:'full-body-lane',operation:'replace',
  orderIdAtSelection:42,route,policy,owner:'none',evidence:first};
 const proposal=makeRecoveryProposal(a,s,opts);
 assert.deepEqual(proposal,{
  source:'full-body-lane',operation:'replace',policy,
  actorId:'rook',orderId:42,orderKind:'move',
  authoredGoal:p(100,0),goalKey:'200:0',from:p(0,0),
  prior:[p(12,0)],next:route,seconds:5,blockedSeconds:2,
  blocker:'wall',owner:'none',doorId:null,
  retryRouteAt:0,lastRepairAt:0,recoveryAttempts:2,evidence:first
 });
 assert.strictEqual(proposal.next,route,'enforcement preflight does not copy nav');
 assert.strictEqual(proposal.prior,a.nav,'live nav authority remains original');
 assert.deepEqual(a.nav,[p(12,0)]);
 assert.equal(a.plan[0].id,42);
 a.doorTraversal={doorId:'FRONT'};
 const second=makeRecoveryProposal(a,s,{...opts,
  source:'door-rehearsal',policy:RECOVERY_SOURCE_POLICY['door-rehearsal'],
  owner:'door'});
 assert.equal(second.owner,'door');
 assert.equal(second.doorId,'FRONT');
 assert.equal(second.recoveryAttempts,2);
});

test('R5 consolidated finite and distance helpers respect invalid candidates',()=>{
 assert.equal(finiteRecoveryPoint(p(-10,5)),true);
 assert.equal(finiteRecoveryPoint(p(Infinity,1)),false);
 assert.equal(finiteRecoveryRoute([]),true,
  'empty route eligibility is source-specific, not a finite-validator rule');
 assert.equal(finiteRecoveryRoute([p(5,5),p(NaN,0)]),false);
 assert.equal(recoveryDistance(p(0,0),p(3,4)),5);
});

test('R5 R2 ordinary progress still means physical feet, not adoption',()=>{
 const a=actor(),s=session();
 const result=evaluateOrdinaryRecoveryAdoption({
  actor:a,session:s,source:'full-body-lane',operation:'replace',
  goal:p(100,0),route:[p(8,12),p(100,0)],
  orderIdAtSelection:42,eligible:true,
  certificate:'first-full-body-stride',watchSafe:true,useful:true,
  retry:'normal-lane-window',recurrence:'full-body-lane'
 });
 assert.equal(result.accepted,true);
 const w=readAdoptionWitness(a,'ordinary');
 assert.deepEqual(w,{
  source:'full-body-lane',state:'provisional',distance:0,
  remaining:100,selectedAt:5
 });
 assert.equal(ordinaryRecoveryProgress(a).status,'provisional');
 assert.equal(acquisitionProgress(a),null,
  'no competing R4 witness should survive the new ordinary adoption');
 a.p=p(.29,0);
 assert.equal(ordinaryRecoveryProgress(a).status,'provisional');
 a.p=p(.31,0);
 assert.equal(ordinaryRecoveryProgress(a).status,'foot-progress');
 assert.equal(a.recoveryAttempts,2,'witness must not reset motor retries');
 assert.equal(a.blockedTime,2,'witness must not claim blocked recovery');
});

test('R5 latest-family wins: R4 negative search supersedes R2 witness without fake travel',()=>{
 const a=actor(),s=session();
 recordAdoptionWitness(a,'ordinary','full-body-lane',p(100,0),s.seconds);
 assert.ok(ordinaryRecoveryProgress(a));
 a.nav=[];
 const result=authorizeRouteAcquisition({
  actor:a,session:s,source:'initial-intel',
  goal:p(100,0),route:[],orderIdAtSelection:42,
  certificate:'known-intel-query',eligible:true,
  physicalProof:false,initialRouteAbsent:true
 });
 assert.equal(result.kind,'no-route');
 assert.equal(ordinaryRecoveryProgress(a),null,
  'one actor has ONE most recent adoption witness, not stale R2 state');
 assert.equal(acquisitionProgress(a).state,'no-route');
 a.p=p(4,0);
 assert.equal(acquisitionProgress(a).state,'no-route',
  'movement after negative search cannot retrospectively make it a route');
 a.plan[0].id=43;
 assert.equal(acquisitionProgress(a).state,'superseded',
  'new authored order supersedes the negative query before all else');
 assert.equal(a.recoveryAttempts,2);
 assert.equal(a.blockedTime,2);
});

test('R5 new R2 recovery replaces negative R4 with physical witness',()=>{
 const a=actor(),s=session();
 recordAdoptionWitness(a,'acquisition','initial-intel',p(100,0),5,true);
 assert.equal(acquisitionProgress(a).state,'no-route');
 recordAdoptionWitness(a,'ordinary','blocked-leg-connector',p(90,0),5.5);
 assert.equal(acquisitionProgress(a),null);
 assert.equal(ordinaryRecoveryProgress(a).status,'provisional');
 a.p=p(2,0);
 assert.equal(ordinaryRecoveryProgress(a).status,'foot-progress');
 assert.equal(ordinaryRecoveryProgress(a).remaining,88);
});

test('R5 rejected route acquisition cannot overwrite a prior accepted witness',()=>{
 const a=actor(),s=session();
 recordAdoptionWitness(a,'ordinary','full-body-lane',p(100,0),1);
 const failed=authorizeRouteAcquisition({
  actor:a,session:s,source:'forced-door-shortcut',
  goal:p(100,0),route:[p(2,0)],
  orderIdAtSelection:42,certificate:'broken-latch-world-shortcut',
  eligible:true,physicalProof:false,initialRouteAbsent:false
 });
 assert.equal(failed.kind,'reject');
 assert.equal(acquisitionProgress(a),null);
 assert.equal(ordinaryRecoveryProgress(a).adoptedAt,1);
});

test('R5 specialist gate retains separate high-priority door/STACK policy',()=>{
 const a=actor(),s=session();
 a.plan[0].stackDoorId='FRONT';
 const r=evaluateSpecialistRecoveryAdoption({
  actor:a,session:s,source:'lane-cycle-world',
  operation:'replace',route:[p(10,10),p(100,0)],goal:p(100,0),
  orderIdAtSelection:42,owner:'generated-stack',
  certificate:'swept-full-body',eligible:true,clearanceVerified:true,
  cooldownClaimed:true,recurrenceClaimed:true,useful:true
 });
 assert.equal(r.accepted,true);
 assert.equal(r.proof.owner,'squad');
 assert.equal(r.proof.policyOverride.priority,3);
 assert.equal(r.decision.verdict,'would-adopt');
 assert.equal(acquisitionProgress(a),null);
 assert.equal(ordinaryRecoveryProgress(a),null,
  'R3 is not silently counted as ordinary or initial acquisition');
});

test('R5 frozen writer census and R0/R2/R3 historical audits remain exact',()=>{
 const census=inspectR0();
 assert.equal(census.routeWriters.core,30);
 assert.equal(census.routeWriters.extended,36);
 assert.equal(R0_CORE_ORIGINAL_LINES.length,19);
 assert.equal(R2_REVIEWED_WRITER_LINES['src/breach-motor-route.ts'].length,11);
 assert.equal(R3_REVIEWED_ROUTE_WRITER_LINES.length,11);
});

test('R5 480-tick real 60Hz outward-leaf motor parity with observer off/on',()=>{
 const r=verifyR1ShadowMotorParity(480);
 assert.equal(r.parity,true);
 assert.ok(r.events>0);
});
