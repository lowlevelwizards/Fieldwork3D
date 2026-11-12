/** Package C8: integrate the verified C1-C7 contracts rather than add
 * another scene/gameplay owner. Physical tests deliberately use real sites.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,enemies} from '../src/breach-game.ts';
import {generateSite} from '../src/breach-site.ts';
import {COVER,activeSite,activateSite}
 from '../src/breach-core.ts';
import {sessionWorldGeometry,adoptPresentationWorldSession,
 setPresentationWorldSession,publishSessionCoverToActiveSite}
 from '../src/breach-world-context.ts';
import {auditWindowGeometryContract}
 from '../src/worldgen/window-geometry-contract.ts';
import {auditMissionScenario,resolvedMissionPopulation}
 from '../src/breach-mission-semantics.ts';
import {compileMissionFacts} from '../src/briefing/mission-facts.ts';
import {captureMissionStart,siteForMissionRestart,
 restoreMissionStartingTeam} from '../src/breach-mission-restart.ts';
import {captureReplayManifest,applyReplayActorIdentity}
 from '../src/breach-replay-manifest.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {inspectPackageC,verifyPackageC}
 from '../scripts/verification/package-c8-integration-audit.mjs';

const cleanup=()=>{setPresentationWorldSession(null);activateSite(null)};

test('C8 generated world, armed factions, objectives, briefing and film agree',()=>{
 try{
  for(const [seed,mission] of [[11,'capture'],[12,'intel'],[13,'rescue']]){
   const site=generateSite(seed,'small',undefined,{mission});
   assert.equal(site.encounter?.mission,mission);
   assert.deepEqual(auditWindowGeometryContract(site),[]);
   assert.deepEqual(auditMissionScenario(site),[]);
   const session=newSession(0,seed,'floor-plan','small',mission,site,
    {enableCivilians:true});
   assert.equal(session.missionType,mission);
   assert.equal(session.site,site);
   assert.equal(enemies(session).length,site.encounter.actors.length);
   assert.ok(team(session).every(a=>a.side==='blue'));
   assert.ok(enemies(session).every(a=>a.side==='red'));
   assert.ok(session.civilians.every(a=>!('side' in a)));
   const population=resolvedMissionPopulation(session);
   const facts=compileMissionFacts(session);
   assert.equal(facts.hostileCount,population.hostileCount);
   assert.deepEqual(facts.armedProfileCount,population.armedProfileCount);
   assert.equal(facts.activeCivilianCount,population.activeCivilianCount);
   assert.equal(facts.rescueTargetPresent,population.rescueTargetPresent);
   assert.equal(facts.captureTargetPresent,population.captureTargetPresent);
   assert.equal(mission==='capture',facts.captureTargetPresent);
   assert.equal(mission==='rescue',facts.rescueTargetPresent);
   const rec=new MissionRecorder();
   rec.capture(session,true);
   assert.ok(rec.frames.length>0,'initial film frame is recorded');
   const manifest=captureReplayManifest(session);
   assert.equal(manifest.missionType,mission);
   assert.deepEqual(manifest.site,site);
   assert.deepEqual(manifest.actors.map(a=>a.side),
    session.operators.map(a=>a.side));
   assert.deepEqual(manifest.actors.map(a=>a.id),
    session.operators.map(a=>a.id));
  }
 }finally{cleanup()}
});

test('C8 restart and replay identity preserve resolved geometry without spawning a new mission',()=>{
 try{
  const site=generateSite(11,'small',undefined,{mission:'capture'});
  const live=newSession(0,11,'exterior-known','small','capture',site);
  adoptPresentationWorldSession(live);
  const ownerSite=activeSite(),priorCover=structuredClone(COVER);
  const start=captureMissionStart(live,'small');
  const manifest=captureReplayManifest(live);
  const replay=newSession(0,11,'exterior-known','small',
   manifest.missionType,structuredClone(manifest.site));
  assert.strictEqual(activeSite(),ownerSite,
   'background replay construction cannot replace live presentation');
  publishSessionCoverToActiveSite(replay);
  assert.deepEqual(COVER,priorCover,'background world cannot publish cover');
  const beforeReplayHealth=replay.operators.map(a=>a.health);
  applyReplayActorIdentity(replay,manifest);
  assert.deepEqual(replay.operators.map(a=>a.health),beforeReplayHealth);
  assert.deepEqual(replay.operators.map(a=>a.side),
   manifest.actors.map(a=>a.side));
  assert.equal(replay.captureTarget,live.captureTarget);
  assert.deepEqual(replay.site,manifest.site);
  const restart=newSession(start.variant,start.seed,start.intelMode,
   start.scale,start.missionType,siteForMissionRestart(start));
  restoreMissionStartingTeam(restart,start);
  assert.equal(restart.captureTarget,live.captureTarget);
  assert.equal(restart.missionType,'capture');
  assert.deepEqual(restart.site,start.site);
  assert.notStrictEqual(sessionWorldGeometry(restart),
   sessionWorldGeometry(live));
  assert.deepEqual(sessionWorldGeometry(restart).walls,
   sessionWorldGeometry(live).walls);
  assert.strictEqual(activeSite(),ownerSite);
  assert.deepEqual(manifest.site,site,
   'replay preserves original site rather than a regenerated version');
 }finally{cleanup()}
});

test('C8 late prebuilt mission override remains an advisory, never a hidden geometry rewrite',()=>{
 try{
  const site=generateSite(12,'small');
  const original=structuredClone(site);
  const live=newSession(0,12,'true-blind','small','intel',site);
  assert.equal(live.missionType,'intel');
  assert.deepEqual(site,original);
  assert.deepEqual(live.site.enemies,site.enemies);
  assert.deepEqual(auditMissionScenario(site,{mission:'intel',
   explicitOverride:true}).filter(x=>x.severity==='error'),[]);
  const start=captureMissionStart(live,'small');
  const replay=captureReplayManifest(live);
  assert.equal(start.missionType,'intel');
  assert.equal(replay.missionType,'intel');
  assert.equal(replay.site.encounter.mission,site.encounter.mission,
   'historical plan identity must not be rewritten for an override');
 }finally{cleanup()}
});

test('C8 source ownership and regression matrix covers all nine stages',()=>{
 const report=inspectPackageC();
 assert.equal(report.schema,1);
 assert.equal(report.stages.length,9);
 assert.deepEqual(report.missing,[]);
 assert.equal(report.boundaries.every(x=>x.ok),true);
 assert.ok(report.ownerDigests.every(x=>x.sha256.length===64));
 assert.deepEqual(verifyPackageC(report),report);
 assert.throws(()=>verifyPackageC({...report,missing:['src/breach-3d.ts']}),/missing/i);
 assert.throws(()=>verifyPackageC({...report,boundaries:[
  ...report.boundaries.slice(0,1),{key:'regression',ok:false}
 ]}),/regression/i);
});
