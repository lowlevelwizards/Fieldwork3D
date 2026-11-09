import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,liveVisibility,observerPointVisible}
  from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {sightDiagnosticCounts,setSightDiagnosticsEnabled,
  drainSightDiagnostics} from '../src/breach-sight-cost-counters.ts';

test('sight counters remain zero when disabled and drain as detached samples',()=>{
 const s=newSession(0,5419,'true-blind');
 try{
  const actor=team(s)[0];
  assert.ok(actor);
  const p={x:actor.p.x+Math.cos(actor.heading)*75,
    y:actor.p.y+Math.sin(actor.heading)*75};
  setSightDiagnosticsEnabled(false);
  const expected=liveVisibility(s,p);
  const personal=observerPointVisible(s,actor,p);
  assert.deepEqual(drainSightDiagnostics(),{
    liveQueries:0,fullViewQueries:0,liveOcclusionProbes:0,
    liveHits:0,personalQueries:0,personalOcclusionProbes:0
  });
  setSightDiagnosticsEnabled(true);
  assert.equal(liveVisibility(s,p),expected);
  assert.equal(observerPointVisible(s,actor,p),personal);
  const sample=drainSightDiagnostics();
  assert.equal(sample.liveQueries,1);
  assert.equal(sample.fullViewQueries,0);
  assert.ok(sample.liveOcclusionProbes>=0);
  assert.ok(sample.liveHits<=sample.liveQueries);
  assert.equal(sample.personalQueries,1);
  assert.ok(sample.personalOcclusionProbes<=1);
  assert.notStrictEqual(sample,sightDiagnosticCounts);
  assert.equal(drainSightDiagnostics().liveQueries,0);
  s.intel.mode='full-view';
  assert.equal(liveVisibility(s,{x:-9000,y:-9000}),true);
  assert.equal(drainSightDiagnostics().fullViewQueries,1);
  setSightDiagnosticsEnabled(false);
  assert.equal(sightDiagnosticCounts.liveQueries,0);
 }finally{
  setSightDiagnosticsEnabled(false);
  activateSite(null);
 }
});
test('opt-in sampling never affects live FOV or recorded individual discovery',()=>{
 const s=newSession(0,816,'true-blind');
 try{
  const squad=team(s);
  const points=squad.flatMap(actor=>
    [5,40,180,239,241].flatMap(r=>
      [-1.5,0,1.5,3].map(offset=>({
        x:actor.p.x+r*Math.cos(actor.heading+offset),
        y:actor.p.y+r*Math.sin(actor.heading+offset)
      }))));
  setSightDiagnosticsEnabled(false);
  const baseline=points.map(p=>[liveVisibility(s,p),
    observerPointVisible(s,squad[0],p)]);
  setSightDiagnosticsEnabled(true);
  const sampled=points.map(p=>[liveVisibility(s,p),
    observerPointVisible(s,squad[0],p)]);
  assert.deepEqual(sampled,baseline);
  const counters=drainSightDiagnostics();
  assert.equal(counters.liveQueries,points.length);
  assert.equal(counters.personalQueries,points.length);
  assert.ok(counters.liveOcclusionProbes>=counters.liveHits);
 }finally{
  setSightDiagnosticsEnabled(false);
  activateSite(null);
 }
});
