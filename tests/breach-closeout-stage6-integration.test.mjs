/** Stage 6 final integration, not a replacement for device acceptance.
 * Exercise an entire real tactical mission lifecycle across closeout seams:
 * plan -> run at 60 Hz -> record -> seek detached replay -> restore live ->
 * restart from original site. All comparisons use recorded authoritative
 * outcomes; no rebaselining or fake simulation frames.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite,activeSite,COVER,WALLS} from '../src/breach-core.ts';
import {newSession,team,planWaitAt,toggling,stepSession} from '../src/breach-game.ts';
import {MissionRecorder,applyReplayFrame} from '../src/breach-replay.ts';
import {BreachMissionController} from '../src/breach-mission-controller.ts';
import {sessionWorldGeometry,adoptPresentationWorldSession,
 withDetachedPresentationWorld,setPresentationWorldSession}
 from '../src/breach-world-context.ts';
import {captureMissionStart,siteForMissionRestart} from '../src/breach-mission-restart.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {inspectOperatorPoseOutput} from '../src/breach-operator-pose-output.ts';

const hooks={
 preferences:()=>({legacyStudy:false,civilianPreview:true,
  requestedCondition:null,selectedIntelMode:'true-blind',
  requestedSiteScale:'small',selectedLightingMode:'day',mode:'quick'}),
 randomSeed:()=>23,refreshQuickRoster:()=>{},
 applyRoster:()=>{},applyCampaign:()=>{},buildDossier:()=>undefined
};
const signature=s=>({
 seconds:s.seconds,phase:s.phase,rng:s.rng,objectRevision:s.objectRevision,
 site:JSON.stringify(s.site),cover:JSON.stringify(s.coverState),
 operators:s.operators.map(a=>({
  id:a.id,p:{...a.p},health:a.health,shots:a.shots,
  magazine:a.magazine,plan:structuredClone(a.plan)
 })),
 civilians:s.civilians.map(c=>({id:c.id,p:{...c.p},health:c.health})),
 battle:structuredClone(s.battleEvents),
 execution:structuredClone(s.executionEvents)
});
const clean=()=>{setPresentationWorldSession(null);activateSite(null);};

test('Stage 6: authentic mission -> 60 Hz recording -> detached replay -> live -> restart',()=>{
 try{
  const controller=new BreachMissionController(hooks);
  const live=controller.create({variant:0,seed:23,missionOverride:'hold'});
  const originalSite=structuredClone(live.site);
  const physical=sessionWorldGeometry(live);
  assert.equal(activeSite(),live.site);
  assert.equal(team(live).length,4);
  assert.equal(live.seconds,0);
  const first=team(live)[0];
  assert.ok(planWaitAt(live,first.id,.5,'here'));
  const recorder=controller.recordInitial(live);
  controller.captureBeforeExecution(live,recorder);
  const start=captureMissionStart(live,'small');
  toggling(live);
  assert.equal(live.phase,'running');
  for(let tick=0;tick<96;tick++){
   stepSession(live,1/60);
   if(tick%6===0)recorder.capture(live);
  }
  recorder.capture(live,true);
  assert.ok(recorder.frames.length>3);
  assert.ok(recorder.duration>0);
  assert.ok(live.seconds>1);
  assert.ok(recorder.completeness.complete);
  const liveAtReplayStart=signature(live);
  const activeCover=structuredClone(COVER),walls=structuredClone(WALLS);
  const replay=controller.createReplaySession(recorder,live);
  assert.notEqual(replay,live);
  assert.equal(activeSite(),live.site,
   'replay construction must leave displayed mission unchanged');
  assert.deepEqual(WALLS,walls);
  assert.deepEqual(COVER,activeCover);
  assert.notStrictEqual(sessionWorldGeometry(replay),physical);
  assert.deepEqual(signature(live),liveAtReplayStart);
  adoptPresentationWorldSession(replay);
  assert.equal(activeSite(),replay.site);
  for(const time of [recorder.duration,0,recorder.duration/2,0]){
   const frame=recorder.sample(time);
   assert.ok(frame,'recorded film must be seekable');
   applyReplayFrame(replay,frame);
   assert.deepEqual(signature(live),liveAtReplayStart,
    'seeking historical frames must not rewrite live state');
   assert.strictEqual(sessionWorldGeometry(live),physical);
  }
  assert.strictEqual(controller.resumeLiveSession(live),live);
  assert.equal(activeSite(),live.site);
  assert.deepEqual(COVER,live.coverState);
  assert.deepEqual(signature(live),liveAtReplayStart);
  const request=controller.restartRequest(controller.restartSnapshot(live));
  const restarted=controller.create(request);
  controller.restoreStartingSetup(restarted,start);
  assert.notStrictEqual(restarted,live);
  assert.equal(restarted.phase,'planning');
  assert.equal(restarted.started,false);
  assert.equal(restarted.seconds,0);
  assert.deepEqual(restarted.site,originalSite);
  assert.ok(team(restarted).every(a=>a.plan.length===0));
  assert.deepEqual(team(restarted).map(a=>a.id),team(live).map(a=>a.id));
  assert.deepEqual(restarted.battleEvents,[]);
  assert.deepEqual(restarted.executionEvents,[]);
  assert.deepEqual(siteForMissionRestart(start),originalSite);
  assert.equal(activeSite(),restarted.site);
 }finally{clean();}
});

test('Stage 6: editor audit and unrelated seed cannot contaminate resumed world',()=>{
 try{
  const live=newSession(0,23,'true-blind','small');
  adoptPresentationWorldSession(live);
  const before=signature(live),world=sessionWorldGeometry(live);
  const site=activeSite(),cover=structuredClone(COVER),walls=structuredClone(WALLS);
  assert.throws(()=>withDetachedPresentationWorld(()=>{
   const background=newSession(0,99,'full-view','small');
   assert.notEqual(background.site?.seed,live.site?.seed);
   assert.notStrictEqual(sessionWorldGeometry(background),world);
   throw Error('preview cancelled');
  }),/preview cancelled/);
  assert.equal(activeSite(),site);
  assert.deepEqual(COVER,cover);
  assert.deepEqual(WALLS,walls);
  assert.deepEqual(signature(live),before);
  assert.strictEqual(sessionWorldGeometry(live),world);
 }finally{clean();}
});

test('Stage 6: pose publishing is context-free and reusable after replay seeks',()=>{
 const pose={x:0,z:0,heading:.2,travelYaw:.2,pelvisYaw:-.2,
  velocity:0,turning:0,seconds:1,stride:0,
  posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
  lastDoorAt:-100,lastThrowAt:-100,down:false,surrender:false,
  aiming:false,firing:false,aimBlend:0,shotHeading:.2,
  poseV3Preview:true,poseV4ReloadPreview:true,deterministic:true};
 const live=createOperatorRig('stage6-operator','blue',true);
 const replay=createOperatorRig('stage6-operator','blue',true);
 try{
  poseOperator(live,pose,0);
  poseOperator(replay,pose,0);
  const frame=a=>inspectOperatorPoseOutput(a);
  const snapshot=a=>frame(a).slots.map(s=>[s.id,...s.values]);
  const original=snapshot(live);
  assert.deepEqual(snapshot(replay),original);
  poseOperator(replay,{...pose,seconds:10,aiming:true,aimBlend:1},0);
  poseOperator(replay,pose,-1);
  assert.deepEqual(snapshot(replay),original,
   'historical camera seek should not leave future pose transforms');
  assert.equal(frame(live).generation,1);
  assert.equal(frame(replay).generation,3);
 }finally{live.dispose();replay.dispose();}
 assert.equal(inspectOperatorPoseOutput(live),null);
 assert.equal(inspectOperatorPoseOutput(replay),null);
});
