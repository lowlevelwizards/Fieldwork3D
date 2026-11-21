import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateOrdinaryRecoveryAdoption,ordinaryRecoveryProgress}
 from '../src/breach-ordinary-recovery-adoption.ts';
import {setRecoveryProposalObserver}
 from '../src/breach-recovery-shadow.ts';
import {setTransientRoute,prependTransientLeg}
 from '../src/breach-route-transition.ts';
import {inspectR0,R0_CORE_ORIGINAL_LINES}
 from '../scripts/verification/movement-recovery-r0-audit.mjs';
import {verifyR1ShadowMotorParity}
 from '../scripts/verification/movement-recovery-r1-shadow-audit.mjs';

const p=(x,y)=>({x,y});
const actor=()=>({
 id:'ash',side:'blue',p:p(0,0),nav:[p(12,0)],
 plan:[{kind:'move',id:42,p:p(100,0)}],
 routeGoalKey:'100:0',blockedTime:2,lastBlocker:'wall',
 lastNavRepairAt:1,lastNormalLaneProbeAt:5,
 retryRouteAt:0,recoveryAttempts:2,
 traversal:false,traversalPending:false,doorTraversal:null
});
const session=()=>({seconds:5,doors:[]});
const route=[p(8,12),p(100,0)];
const input=(a,s,source='full-body-lane',overrides={})=>({
 actor:a,session:s,source,goal:p(100,0),route,
 operation:source==='local-detour'?'prepend':'replace',
 orderIdAtSelection:42,eligible:true,
 certificate:source==='full-body-lane'||
   source==='blocked-leg-connector'?'first-full-body-stride':
   source==='local-detour'?'swept-local-detour':
   source==='collision-world-replan'?'world-route-selected':
   'known-intel-route-selected',
 watchSafe:true,useful:true,
 retry:source==='full-body-lane'?'normal-lane-window':
  source==='local-detour'?'hysteretic-detour':'collision-retry',
 recurrence:source==='full-body-lane'?'full-body-lane':
  source==='blocked-leg-connector'?'blocked-leg-connector':
  source==='local-detour'?'none':'collision-replan',
 ...overrides
});

test('R2: explicit verified first-step proposal adopts without moving feet or orders',()=>{
 const a=actor(),s=session(),before=structuredClone(a.plan);
 const verdict=evaluateOrdinaryRecoveryAdoption(input(a,s));
 assert.equal(verdict.accepted,true);
 assert.deepEqual(verdict.decision,{verdict:'would-adopt',reason:'eligible'});
 assert.deepEqual(verdict.proof.evidence,{
  eligibility:'pass',clearance:'pass',cooldown:'pass',
  recurrence:'pass',progress:'pass'
 });
 assert.deepEqual(a.nav,[p(12,0)]);
 assert.deepEqual(a.plan,before);
 assert.equal(a.recoveryAttempts,2);
 assert.equal(a.blockedTime,2);
 assert.equal(ordinaryRecoveryProgress(a)?.status,'provisional');
 a.p=p(1,0);
 assert.equal(ordinaryRecoveryProgress(a)?.status,'foot-progress');
 assert.equal(ordinaryRecoveryProgress(a)?.traveled,1);
 a.plan=[{kind:'move',id:43,p:p(140,0)}];
 assert.equal(ordinaryRecoveryProgress(a)?.status,'superseded');
});

test('R2: same stationary actor, first leg and GO shares M2 recurrence budget across ordinary sources',()=>{
 const a=actor(),s=session();
 const cases=[
  input(a,s,'full-body-lane'),
  input(a,s,'blocked-leg-connector'),
  input(a,s,'collision-world-replan'),
  input(a,s,'collision-intel-replan')
 ];
 for(const c of cases.slice(0,3))
  assert.equal(evaluateOrdinaryRecoveryAdoption(c).accepted,true,c.source);
 const fourth=evaluateOrdinaryRecoveryAdoption(cases[3]);
 assert.equal(fourth.accepted,false);
 assert.deepEqual(fourth.decision,{
  verdict:'would-defer',reason:'route-recurrence'});
 assert.equal(fourth.proof.evidence.recurrence,'fail');
 a.p=p(4,0);
 assert.equal(evaluateOrdinaryRecoveryAdoption(cases[3]).accepted,true,
  'a real 4-unit departure resets the stationary recurrence witness');
});

test('R2: physical blockage, tail churn and missing first-step proof are rejected',()=>{
 const a=actor(),s=session();
 const stale=evaluateOrdinaryRecoveryAdoption(input(a,s,'collision-world-replan',{
  route:[p(12,0),p(70,40),p(100,0)]
 }));
 assert.deepEqual(stale.decision,{
  verdict:'would-defer',reason:'no-physical-progress'});
 const noProof=evaluateOrdinaryRecoveryAdoption(input(a,s,'full-body-lane',{
  certificate:'world-route-selected'
 }));
 assert.deepEqual(noProof.decision,{
  verdict:'would-reject',reason:'physical-blocked'});
 assert.equal(evaluateOrdinaryRecoveryAdoption(input(a,s,'local-detour',{
  watchSafe:false,route:[p(3,7),...a.nav],
  retry:'hysteretic-detour'
 })).decision.reason,'physical-blocked');
 const empty=evaluateOrdinaryRecoveryAdoption(input(a,s,'full-body-lane',{
  route:[]
 }));
 assert.equal(empty.accepted,false);
 assert.equal(empty.decision.reason,'ineligible');
});

test('R2: stale authored GO, active traversal and retry cooldown cannot adopt',()=>{
 const a=actor(),s=session();
 a.plan[0].id=43;
 assert.equal(evaluateOrdinaryRecoveryAdoption(input(a,s)).decision.reason,
  'stale-order');
 a.plan[0].id=42;a.traversalPending=true;
 assert.equal(evaluateOrdinaryRecoveryAdoption(input(a,s)).decision.reason,
  'protected-owner');
 a.traversalPending=false;
 a.lastNormalLaneProbeAt=2;
 assert.equal(evaluateOrdinaryRecoveryAdoption(input(a,s)).decision.reason,
  'cooling-down');
 a.lastNormalLaneProbeAt=5;
 a.doorTraversal={doorId:'ENTRY',maneuver:'outside-leaf',
  waypoints:[p(12,0)],lastProgressAt:4.9};
 assert.equal(evaluateOrdinaryRecoveryAdoption(input(a,s)).decision.reason,
  'protected-owner');
});

test('R2: cold frame detour and normal hysteresis keep distinct time claims',()=>{
 const a=actor(),s=session();
 a.lastNavRepairAt=5;
 const frame=input(a,s,'local-detour',{
  route:[p(3,8),...a.nav],retry:'cold-frame-detour',
  recurrence:'frame-actor-detour'
 });
 const r=evaluateOrdinaryRecoveryAdoption(frame);
 assert.equal(r.accepted,true);
 const ordinary=evaluateOrdinaryRecoveryAdoption(input(a,s,'local-detour',{
  route:[p(6,9),...a.nav],retry:'hysteretic-detour',
  recurrence:'none'
 }));
 assert.equal(ordinary.decision.reason,'cooling-down');
});

test('R2: optional transition witness reports REAL verified proof, not invented unknowns',()=>{
 const a=actor(),s=session(),events=[];
 const routeA=[p(7,10),p(100,0)];
 const verdict=evaluateOrdinaryRecoveryAdoption(input(a,s,'full-body-lane',{
  route:routeA
 }));
 assert.equal(verdict.accepted,true);
 try{
  setRecoveryProposalObserver(event=>events.push(event));
  setTransientRoute(s,a,routeA,'full-body-lane',verdict.proof);
  const b=actor();b.lastNavRepairAt=2;
  const leg=p(6,7),second=evaluateOrdinaryRecoveryAdoption(
   input(b,s,'local-detour',{
    route:[leg,...b.nav],retry:'hysteretic-detour',recurrence:'none'
   }));
  assert.equal(second.accepted,true);
  prependTransientLeg(s,b,leg,'local-detour',second.proof);
 }finally{setRecoveryProposalObserver(null);}
 assert.equal(events.length,2);
 assert.deepEqual(events.map(x=>x.decision.verdict),
  ['would-adopt','would-adopt']);
 assert.ok(events.every(x=>Object.values(x.proposal.evidence)
  .every(v=>v==='pass')));
 assert.deepEqual(a.nav,routeA);
 assert.deepEqual(a.plan[0].p,p(100,0));
});

test('R2: R0 baseline still enumerates 30 core writers and original anchors',()=>{
 const snapshot=inspectR0();
 assert.equal(snapshot.routeWriters.core,30);
 assert.equal(snapshot.routeWriters.extended,36);
 assert.equal(R0_CORE_ORIGINAL_LINES.length,19);
 assert.equal(R0_CORE_ORIGINAL_LINES[0],198);
 assert.equal(R0_CORE_ORIGINAL_LINES.at(-1),823);
});

test('R2: actual 60Hz outward-leaf motor is identical with shadow witness on/off',()=>{
 const r=verifyR1ShadowMotorParity(480);
 assert.equal(r.parity,true);
 assert.ok(r.events>0);
});
