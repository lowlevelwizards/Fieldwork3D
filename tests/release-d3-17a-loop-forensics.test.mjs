import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeD317LoopIncidents} from '../scripts/lib/d3-17a-loop-incidents.mjs';
const w=(seconds,actor,classification,suspicious,travel,net,extra={})=>({
 seconds,actor,classification,suspicious,travel,net,
 goalReduction:0,remaining:100,position:{x:20,y:20},
 nextNav:{x:40,y:40},motorPause:null,orderIssue:null,
 blockedSeconds:0,passageSeconds:0,openingSeconds:0,
 squeezeSeconds:0,retries:0,doorEpisode:null,...extra
});
const make=(progressEvidence,operators=[{id:'ash',arrived:false,outcome:'pending',remaining:24}])=>({
 corpus:'d3-15b4-tenth-blind22-20261115',ticks:2700,
 rows:[{seed:123,archetype:'motel',scale:'small',modes:[
  {mode:'entry',progressEvidence,operators,
   routeTransitions:{byActor:{'ash:door-leaf-escape':3,'ash:initial-intel':5}}}
 ]}],summary:{physicalArrivals:3,physicsStepViolations:0},
 progressSummary:{suspectedLoops:progressEvidence.filter(x=>
  x.classification==='movement-loop'&&x.suspicious).length}
});
test('D3.17A: consecutive low-net travel becomes one reproducible loop incident',()=>{
 const data=make([
  w(5,'ash','movement-loop',false,80,3),
  w(10,'ash','movement-loop',true,90,2),
  w(15,'ash','movement-loop',true,55,4),
  w(20,'ash','moving-goalward',false,68,67,{goalReduction:65})
 ]);
 const old=JSON.stringify(data),out=analyzeD317LoopIncidents(data);
 assert.equal(JSON.stringify(data),old,'forensic report must not edit audit evidence');
 assert.equal(out.summary.flaggedWindows,2);
 assert.equal(out.summary.incidents,1);
 assert.equal(out.summary.consecutiveLoopIncidents,1);
 assert.equal(out.summary.isolatedFlaggedIncidents,0);
 assert.equal(out.summary.orphanFlaggedWindows,0);
 assert.equal(out.incidents[0].seed,123);
 assert.equal(out.incidents[0].actor,'ash');
 assert.equal(out.incidents[0].intervalStart,0);
 assert.equal(out.incidents[0].intervalEnd,15);
 assert.equal(out.incidents[0].travel,225);
 assert.equal(out.incidents[0].lowNetTravel,216);
 assert.equal(out.incidents[0].routeCounts['door-leaf-escape'],3);
});
test('D3.17A: identical actor after a productive step is a distinct episode',()=>{
 const out=analyzeD317LoopIncidents(make([
  w(5,'ash','movement-loop',false,30,2),
  w(10,'ash','movement-loop',true,50,1),
  w(15,'ash','moving-goalward',false,60,60),
  w(20,'ash','movement-loop',false,70,3),
  w(25,'ash','movement-loop',true,90,2)
 ]));
 assert.equal(out.summary.flaggedWindows,2);
 assert.equal(out.summary.incidents,2);
 assert.deepEqual(out.incidents.map(x=>x.intervalStart),[15,0]);
});
test('D3.17A: classify only timestamped, same-actor, in-episode route transitions',()=>{
 const data=make([
  w(5,'ash','moving-goalward',false,70,60),
  w(10,'ash','movement-loop',false,80,2,{position:{x:11,y:12}}),
  w(15,'ash','movement-loop',true,90,2,{position:{x:11,y:12.002}}),
  w(20,'ash','moving-goalward',false,70,60)
 ]);
 data.rows[0].modes[0].routeTransitions.events=[
  {actorId:'ash',seconds:3,source:'initial-intel'},
  {actorId:'moss',seconds:11,source:'door-rehearsal'},
  {actorId:'ash',seconds:7,source:'full-body-lane'},
  {actorId:'ash',seconds:13,source:'full-body-lane'},
  {actorId:'ash',seconds:17,source:'blocked-leg-connector'}
 ];
 const out=analyzeD317LoopIncidents(data);
 assert.equal(out.incidents[0].routeCounts['door-leaf-escape'],3,
  'historical run totals must remain separate from incident evidence');
 assert.deepEqual(out.incidents[0].episodeRouteCounts,{'full-body-lane':2});
 assert.deepEqual(out.incidents[0].routeEvents.map(e=>e.seconds),[7,13]);
 assert.equal(out.incidents[0].sampledReturnDistance,0);
 assert.equal(out.summary.incidentsWithTimedRoutes,1);
 assert.equal(out.summary.timedRouteEvents,2);
});
test('D3.17A: carryover from physical obstruction is isolated, not a proven two-window loop',()=>{
 const out=analyzeD317LoopIncidents(make([
  w(5,'ash','physical-obstruction',true,0,0,{blockedSeconds:4}),
  w(10,'ash','movement-loop',true,40,1),
  w(15,'ash','moving-detour',false,60,57)
 ]));
 assert.equal(out.summary.suspiciousPhysicalBlockWindows,1);
 assert.equal(out.summary.isolatedFlaggedIncidents,1);
 assert.equal(out.summary.consecutiveLoopIncidents,0);
 assert.equal(out.summary.orphanFlaggedWindows,0);
 assert.equal(out.incidents[0].evidenceClass,'isolated-flagged-window-check-prior-state');
});
test('D3.17A: deliberate passage and door waits are never relabelled as loops',()=>{
 const out=analyzeD317LoopIncidents(make([
  w(5,'ash','waiting-for-passage',false,0,0,{passageSeconds:4}),
  w(10,'ash','opening-door',false,0,0,{openingSeconds:4}),
  w(15,'ash','authored-hold',false,0,0)
 ]));
 assert.equal(out.summary.incidents,0);
 assert.equal(out.summary.flaggedWindows,0);
});
test('D3.17A: no silently dropped flagged windows or mismatched canonical report',()=>{
 const data=make([w(5,'ash','movement-loop',true,30,1)]);
 data.progressSummary.suspectedLoops=2;
 assert.throws(()=>analyzeD317LoopIncidents(data),/window count mismatches/);
});
