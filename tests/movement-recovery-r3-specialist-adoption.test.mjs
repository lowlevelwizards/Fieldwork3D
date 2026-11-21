import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateSpecialistRecoveryAdoption,authorizeSpecialistRecovery}
 from '../src/breach-specialist-recovery-adoption.ts';
import {RECOVERY_SOURCE_POLICY} from '../src/breach-recovery-adoption-contract.ts';
import {setRecoveryProposalObserver} from '../src/breach-recovery-shadow.ts';
import {setTransientRoute} from '../src/breach-route-transition.ts';
import {inspectR0,R2_REVIEWED_WRITER_LINES}
 from '../scripts/verification/movement-recovery-r0-audit.mjs';
import {verifyR1ShadowMotorParity}
 from '../scripts/verification/movement-recovery-r1-shadow-audit.mjs';

const p=(x,y)=>({x,y});
const actor=()=>({
 id:'rook',side:'blue',p:p(0,0),nav:[p(12,0)],plan:[
  {id:21,kind:'move',p:p(100,0),entryDoorId:'ENTRY'}
 ],routeGoalKey:'100:0',lastBlocker:'door',blockedTime:2,
 retryRouteAt:0,lastNavRepairAt:0,recoveryAttempts:2,
 squeeze:false,traversal:null,traversalPending:false,
 doorTraversal:{doorId:'ENTRY',maneuver:'grab-and-hold',
  waypoints:[],phase:'clear-leaf',destination:p(100,0),
  lastProgressAt:3,lastTransitionAt:3}
});
const session=()=>({seconds:5,doors:[]});
const candidate=(a,s,source='door-rehearsal',owner='door-episode',
 certificate='swept-full-body',extra={})=>({
 actor:a,session:s,source,operation:'replace',
 route:[p(10,10),p(100,0)],goal:p(100,0),
 orderIdAtSelection:21,owner,certificate,
 eligible:true,clearanceVerified:true,cooldownClaimed:true,
 recurrenceClaimed:true,useful:true,...extra
});

test('R3 admits real swept doorway rehearsal with matching order and episode',()=>{
 const a=actor(),s=session(),saved=structuredClone(a.plan);
 const result=evaluateSpecialistRecoveryAdoption(candidate(a,s));
 assert.equal(result.accepted,true);
 assert.deepEqual(result.decision,{verdict:'would-adopt',reason:'eligible'});
 assert.equal(result.proof.owner,'door');
 assert.equal(result.proof.policyOverride.priority,4);
 assert.equal(result.proof.policyOverride.clearance,'full-body');
 assert.ok(Object.values(result.proof.evidence).every(x=>x==='pass'));
 assert.deepEqual(a.plan,saved);
 assert.deepEqual(a.nav,[p(12,0)]);
 assert.equal(a.recoveryAttempts,2);
 assert.equal(a.blockedTime,2);
});

test('R3 routes crossing an active generated STACK use squad priority, not ordinary priority',()=>{
 const a=actor(),s=session();
 a.plan[0].entryDoorId=undefined;a.plan[0].stackDoorId='ENTRY';
 a.doorTraversal=null;
 for(const source of ['d328-entry-fine-world','stack-micro-corner','lane-cycle-world']){
  const r=evaluateSpecialistRecoveryAdoption(candidate(a,s,source,
   'generated-stack','swept-full-body'));
  assert.equal(r.accepted,true,source);
  assert.equal(r.proof.owner,'squad',source);
  assert.equal(r.proof.policyOverride.priority,3,source);
  assert.equal(r.proof.policyOverride.family,'stack',source);
 }
 // The same source has genuinely different door/STACK semantics.
 a.doorTraversal={doorId:'ENTRY',destination:p(100,0)};
 const door=evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'lane-cycle-world','door-episode','swept-full-body'));
 assert.equal(door.accepted,true);
 assert.equal(door.proof.policyOverride.priority,4);
 assert.equal(RECOVERY_SOURCE_POLICY['lane-cycle-world'].priority,2,
  'source-wide R1 table must not be silently rewritten');
});

test('R3 preserves oriented narrow exit and real portal prefix without claiming full-body clearance',()=>{
 const a=actor(),s=session();a.squeeze=true;
 const narrow=evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'door-squeeze-leaf-exit','narrow-exit','oriented-squeeze'));
 assert.equal(narrow.accepted,true);
 assert.equal(narrow.proof.policyOverride.clearance,'narrow-profile');
 const entry=evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'entry-squeeze-departure','narrow-exit','oriented-squeeze'));
 assert.equal(entry.accepted,true);
 a.squeeze=false;
 const remote=evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'door-escape-future-portal','portal-handoff','door-managed-prefix',
  {route:[p(10,10)]}));
 assert.equal(remote.accepted,true,
  'prefix may stop at first operable door, not remote GO');
 assert.equal(remote.proof.policyOverride.clearance,'door-managed');
 const full=evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'door-escape-world-rejoin','portal-handoff','verified-world-join'));
 assert.equal(full.accepted,true);
});

test('R3 permits empty nav ONLY after physically witnessed leaf escape',()=>{
 const a=actor(),s=session();
 const valid=evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'door-leaf-escape','physical-escape','post-physical-escape',
  {route:[],escapedBody:true}));
 assert.equal(valid.accepted,true);
 assert.equal(valid.decision.verdict,'exempt');
 assert.equal(valid.proof.owner,'door');
 const unwitnessed=evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'door-leaf-escape','physical-escape','post-physical-escape',
  {route:[],escapedBody:false}));
 assert.equal(unwitnessed.accepted,false);
 assert.equal(unwitnessed.decision.reason,'empty-route');
 const other=evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'door-escape-swept-rejoin','physical-escape','swept-full-body',
  {route:[]}));
 assert.equal(other.accepted,false);
 assert.equal(other.decision.reason,'empty-route');
 a.plan=[];
 const exceptional=authorizeSpecialistRecovery(a,s,'door-leaf-escape',[],
  p(100,0),'physical-escape','post-physical-escape',{escapedBody:true});
 assert.ok(exceptional,
  'body-overlap escape can invalidate stale nav without active authored MOVE');
});

test('R3 fails closed on stale orders, missing physical evidence, invalid owner/certificate and nonfinite routes',()=>{
 const a=actor(),s=session();
 const variants=[
  [{orderIdAtSelection:20},'stale-order'],
  [{clearanceVerified:false},'physical-blocked'],
  [{eligible:false},'ineligible'],
  [{owner:'generated-stack'},'ineligible'],
  [{certificate:'oriented-squeeze'},'ineligible'],
  [{route:[p(Number.NaN,1)]},'nonfinite-route'],
  [{cooldownClaimed:false},'cooling-down'],
  [{recurrenceClaimed:false},'route-recurrence'],
  [{useful:false},'no-physical-progress']
 ];
 for(const [extra,reason] of variants){
  const result=evaluateSpecialistRecoveryAdoption(candidate(a,s,
   'door-rehearsal','door-episode','swept-full-body',extra));
  assert.equal(result.accepted,false,JSON.stringify(extra));
  assert.equal(result.decision.reason,reason,JSON.stringify(extra));
 }
 a.doorTraversal=null;
 assert.equal(evaluateSpecialistRecoveryAdoption(candidate(a,s)).accepted,false);
 a.squeeze=false;
 assert.equal(evaluateSpecialistRecoveryAdoption(candidate(a,s,
  'door-squeeze-leaf-exit','narrow-exit','oriented-squeeze')).accepted,false);
});

test('R3 preserved source labels and optional shadow records verified contextual owner',()=>{
 const a=actor(),s=session(),events=[];
 a.plan[0].stackDoorId='ENTRY';a.plan[0].entryDoorId=undefined;
 a.doorTraversal=null;
 const route=[p(5,12),p(100,0)];
 const proof=authorizeSpecialistRecovery(a,s,'lane-cycle-world',route,
  p(100,0),'generated-stack','swept-full-body');
 assert.ok(proof);
 try{
  setRecoveryProposalObserver(event=>events.push(event));
  setTransientRoute(s,a,route,'lane-cycle-world',proof);
 }finally{setRecoveryProposalObserver(null);}
 assert.equal(events.length,1);
 assert.equal(events[0].proposal.owner,'squad');
 assert.equal(events[0].proposal.policy.priority,3);
 assert.equal(events[0].proposal.policy.family,'stack');
 assert.deepEqual(events[0].decision,{verdict:'would-adopt',reason:'eligible'});
 assert.deepEqual(a.plan[0].p,p(100,0));
 assert.deepEqual(a.nav,route);
});

test('R3 R0/R2 inventory still lists the original 36 writers with archived R2 anchors',()=>{
 const current=inspectR0();
 assert.equal(current.routeWriters.core,30);
 assert.equal(current.routeWriters.extended,36);
 assert.equal(R2_REVIEWED_WRITER_LINES['src/breach-motor-collision.ts'].length,19);
 assert.equal(R2_REVIEWED_WRITER_LINES['src/breach-motor-route.ts'].length,11);
 assert.equal(R2_REVIEWED_WRITER_LINES['src/breach-door-traversal-maneuver.ts'].length,4);
});

test('R3 fixed-clock outward-swing motor stays identical with diagnostic observer on/off',()=>{
 const r=verifyR1ShadowMotorParity(480);
 assert.equal(r.parity,true);
 assert.ok(r.events>0);
});
