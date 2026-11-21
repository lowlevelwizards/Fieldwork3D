import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateRouteAcquisition,authorizeRouteAcquisition,
 acquisitionProgress} from '../src/breach-route-acquisition-adoption.ts';
import {setTransientRoute} from '../src/breach-route-transition.ts';
import {setRecoveryProposalObserver}
 from '../src/breach-recovery-shadow.ts';
import {inspectR0,R3_REVIEWED_ROUTE_WRITER_LINES}
 from '../scripts/verification/movement-recovery-r0-audit.mjs';
import {verifyR1ShadowMotorParity}
 from '../scripts/verification/movement-recovery-r1-shadow-audit.mjs';

const p=(x,y)=>({x,y});
const actor=()=>({
 id:'ash',side:'blue',p:p(0,0),nav:[],plan:[
  {kind:'move',id:40,p:p(100,0)}
 ],routeGoalKey:'200:0',blockedTime:2.5,recoveryAttempts:3,
 retryRouteAt:8,lastNavRepairAt:2,lastBlocker:'route',
 doorTraversal:null,traversal:null,traversalPending:false,
 squeeze:false,autoSidestep:null,fireRetreatTarget:null
});
const session=()=>({seconds:5,doors:[]});
const query=(a,s,source='initial-intel',extra={})=>({
 actor:a,session:s,source,route:[p(12,4),p(100,0)],
 goal:p(100,0),orderIdAtSelection:a.plan[0]?.id??null,
 certificate:source==='initial-intel'?'known-intel-query':
  source==='initial-enemy'?'enemy-cached-query':
  source==='fire-retreat'?'swept-fire-lane':
  source==='shove-stage'?'known-shove-crossing':
  source==='initial-portal-recovery'?'first-operable-door-prefix':
  source==='forced-door-shortcut'?'broken-latch-world-shortcut':
  'cold-fine-full-body',
 eligible:true,physicalProof:false,
 initialRouteAbsent:source!=='forced-door-shortcut',
 ...extra
});
test('R4 ordinary initial intel accepts a route as provisional, never arrival',()=>{
 const a=actor(),s=session();
 const before=structuredClone(a.plan);
 const r=authorizeRouteAcquisition(query(a,s));
 assert.equal(r.kind,'adopt');
 assert.equal(r.reason,'none');
 assert.equal(r.proof.policyOverride.intent,'acquisition');
 assert.equal(r.proof.evidence.clearance,'unknown',
  'planner route alone is NOT a full-body sweep');
 assert.equal(r.proof.evidence.progress,'unknown',
  'adoption is never physical movement');
 assert.deepEqual(a.nav,[]);
 assert.deepEqual(a.plan,before);
 assert.equal(a.recoveryAttempts,3);
 assert.equal(a.blockedTime,2.5);
 assert.equal(acquisitionProgress(a).state,'provisional');
 a.p=p(1,0);
 assert.equal(acquisitionProgress(a).state,'moved');
 a.plan[0].id=41;
 assert.equal(acquisitionProgress(a).state,'superseded');
});
test('R4 accepts active DOOR/SYNC and intermediate PIE path queries, not only MOVE',()=>{
 const s=session();
 for(const [kind,target] of [
   ['door',p(15,0)],['sync',p(20,0)],['pie',p(5,10)]
 ]){
  const a=actor();
  a.plan=[{id:40,kind,p:p(100,0)}];
  const result=authorizeRouteAcquisition(query(a,s,'initial-intel',{
    goal:target,route:[p(4,3),target]
  }));
  assert.equal(result.kind,'adopt',
   kind+' is physically moved by existing order executor');
  assert.equal(acquisitionProgress(a).state,'provisional');
  assert.deepEqual(a.plan[0].p,p(100,0),
   'temporary PIE arc steps must never rewrite the authored destination');
  const staged=authorizeRouteAcquisition(query(a,s,'shove-stage',{
    goal:target,route:[p(4,3),target]
  }));
  assert.equal(staged.kind,'adopt',
   kind+' can have a known shove staging before the live motor target');
 }
});
test('R4 empty initial search remains a negative query and preserves fallback chain',()=>{
 const a=actor(),s=session(),events=[];
 const result=authorizeRouteAcquisition(query(a,s,'initial-intel',{route:[]}));
 assert.equal(result.kind,'no-route');
 assert.equal(result.reason,'no-route');
 assert.equal(result.proof.evidence.eligibility,'fail');
 assert.equal(acquisitionProgress(a).state,'no-route');
 try{
  setRecoveryProposalObserver(event=>events.push(event));
  setTransientRoute(s,a,[],'initial-intel',result.proof);
 }finally{setRecoveryProposalObserver(null);}
 assert.deepEqual(a.nav,[]);
 assert.equal(a.recoveryAttempts,3);
 assert.equal(a.blockedTime,2.5);
 assert.equal(events.length,1);
 assert.equal(events[0].proposal.policy.intent,'acquisition');
 assert.equal(events[0].proposal.evidence.progress,'fail');
 // The normal motor may next select known shove staging; empty initial
 // search does not claim the GO or consume a false recovery success.
 const stage=authorizeRouteAcquisition(query(a,s,'shove-stage',{
  route:[p(10,0),p(100,0)]
 }));
 assert.equal(stage.kind,'adopt');
 setTransientRoute(s,a,[p(10,0),p(100,0)],'shove-stage',stage.proof);
 assert.equal(a.nav.length,2);
 assert.deepEqual(a.plan[0].p,p(100,0));
});
test('R4 enemy route can be initially queried without blue authored move',()=>{
 const a=actor(),s=session();a.side='red';a.plan=[];
 const r=authorizeRouteAcquisition(query(a,s,'initial-enemy',{
  orderIdAtSelection:null
 }));
 assert.equal(r.kind,'adopt');
 assert.equal(r.proof.owner,'none');
 assert.equal(evaluateRouteAcquisition(query(a,s,'initial-intel')).kind,
  'reject');
});
test('R4 fire retreat remains a short swept physical correction, independent of normal retries',()=>{
 const a=actor(),s=session();a.plan=[];
 a.fireRetreatTarget=p(8,0);
 const allowed=evaluateRouteAcquisition(query(a,s,'fire-retreat',{
  goal:p(8,0),route:[p(8,0)],orderIdAtSelection:null,
  physicalProof:true
 }));
 assert.equal(allowed.kind,'adopt');
 assert.equal(allowed.proof.policyOverride.clearance,'full-body');
 assert.equal(allowed.proof.policyOverride.priority,4);
 assert.equal(evaluateRouteAcquisition(query(a,s,'fire-retreat',{
  goal:p(8,0),route:[p(8,0)],orderIdAtSelection:null,
  physicalProof:false
 })).reason,'not-physically-cleared');
 a.fireRetreatTarget=null;
 assert.equal(evaluateRouteAcquisition(query(a,s,'fire-retreat',{
  goal:p(8,0),route:[p(8,0)],orderIdAtSelection:null,
  physicalProof:true
 })).reason,'not-authorized');
});
test('R4 broken-latch shortcuts require an old route, valid order, full-body first step',()=>{
 const a=actor(),s=session();a.nav=[p(50,20),p(100,0)];
 const initial=query(a,s,'forced-door-shortcut',{
  route:[p(8,0),p(100,0)],initialRouteAbsent:false,
  physicalProof:true
 });
 const r=authorizeRouteAcquisition(initial);
 assert.equal(r.kind,'adopt');
 assert.equal(r.proof.owner,'door');
 assert.equal(r.proof.policyOverride.intent,'acquisition');
 assert.equal(evaluateRouteAcquisition({...initial,physicalProof:false}).reason,
  'not-physically-cleared');
 assert.equal(evaluateRouteAcquisition({...initial,
  orderIdAtSelection:39}).reason,'stale-order');
 a.doorTraversal={doorId:'FRONT'};
 assert.equal(evaluateRouteAcquisition(initial).reason,'protected-owner');
 a.doorTraversal=null;a.nav=[];
 assert.equal(evaluateRouteAcquisition(initial).reason,'protected-owner');
});
test('R4 first-operable-door prefixes do not pretend to reach final GO',()=>{
 const a=actor(),s=session();
 const r=authorizeRouteAcquisition(query(a,s,'initial-portal-recovery',{
  route:[p(5,0),p(22,0)]
 }));
 assert.equal(r.kind,'adopt');
 assert.equal(r.proof.policyOverride.clearance,'door-managed');
 assert.equal(r.proof.evidence.progress,'unknown');
 assert.deepEqual(a.plan[0].p,p(100,0));
 a.doorTraversal={doorId:'ENTRY'};
 assert.equal(evaluateRouteAcquisition(query(a,s,'initial-portal-recovery',{
  route:[p(22,0)]
 })).reason,'protected-owner');
});
test('R4 cold fine route is full-body-certified and must preserve original GO',()=>{
 const a=actor(),s=session();
 const q=query(a,s,'motor-cold-fine-world',{physicalProof:true});
 assert.equal(evaluateRouteAcquisition(q).kind,'adopt');
 assert.equal(evaluateRouteAcquisition({...q,
  route:[p(12,0),p(80,0)]}).reason,'wrong-route-shape');
 assert.equal(evaluateRouteAcquisition({...q,
  route:[p(12,0),p(100,0)],physicalProof:false}).reason,
  'not-physically-cleared');
 a.squeeze=true;
 assert.equal(evaluateRouteAcquisition(q).reason,'protected-owner');
});
test('R4 fails closed for invalid query source, stale GO, nonfinite, or short-route mismatch',()=>{
 const a=actor(),s=session(),q=query(a,s);
 const failures=[
  [{certificate:'enemy-cached-query'},'wrong-source-certificate'],
  [{eligible:false},'not-authorized'],
  [{orderIdAtSelection:38},'stale-order'],
  [{source:'initial-portal-recovery',
    certificate:'first-operable-door-prefix',goal:p(120,0)},'not-authored-goal'],
  [{route:[p(Infinity,0)]},'nonfinite-route'],
  [{initialRouteAbsent:false},'wrong-route-shape']
 ];
 for(const [overrides,reason] of failures){
  assert.equal(evaluateRouteAcquisition({...q,...overrides}).reason,
   reason,JSON.stringify(overrides));
 }
 assert.equal(evaluateRouteAcquisition(query(a,s,'shove-stage',{
  route:[p(8,0),p(50,0)]
 })).reason,'wrong-route-shape');
 assert.equal(evaluateRouteAcquisition(query(a,s,'shove-stage',{
  route:[]
 })).reason,'empty-route');
});
test('R4 real motor acquisition writers all pass the typed gate before mutation',()=>{
 const src=readFileSync(new URL('../src/breach-motor-route.ts',import.meta.url),'utf8');
 for(const name of ['shortcut','fireDecision','coldDecision','initialDecision',
   'stageDecision','portalDecision'])
  assert.ok(src.includes(name+'=authorizeRouteAcquisition({'),name);
 assert.ok(src.includes("if(initialDecision.kind!=='reject')"));
 assert.ok(src.includes("if(!a.nav.length&&a.side==='blue')"),
  'negative initial route must reach original shove fallback');
 assert.ok(src.includes("if(!a.nav.length&&a.side==='blue'&&a.plan[0]?.kind==='move'"),
  'negative initial route must reach original first-portal fallback');
});
test('R4 R0/R1/R2/R3 writer inventories preserved',()=>{
 const census=inspectR0();
 assert.equal(census.routeWriters.core,30);
 assert.equal(census.routeWriters.extended,36);
 assert.equal(R3_REVIEWED_ROUTE_WRITER_LINES.length,11);
 assert.equal(R3_REVIEWED_ROUTE_WRITER_LINES[5],307);
});
test('R4 real 60Hz outward-door motor remains identical with shadow enabled',()=>{
 const r=verifyR1ShadowMotorParity(480);
 assert.equal(r.parity,true);
 assert.ok(r.events>0);
});
