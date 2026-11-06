import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder,snapshot,applyReplayFrame} from '../src/breach-replay.ts';
import {replayActorVisible,recordedReplayKnowledge,replayBodyDiscovered}
  from '../src/breach-replay-visibility.ts';

test('recorded sight overrides missing playback awareness and never leaks future sightings',()=>{
  const live=newSession(0),hostile=live.operators.find(a=>a.side==='red');
  assert.ok(hostile);
  const playback=newSession(0),frame=snapshot(live);
  frame.knowledge={visibleActorIds:[hostile.id],visibleCivilianIds:[],discoveredBodyIds:[]};
  applyReplayFrame(playback,frame);
  const actor=playback.operators.find(a=>a.id===hostile.id);
  assert.ok(actor);
  assert.equal(replayActorVisible(playback,actor),true);
  const hidden=snapshot(live);
  hidden.knowledge={visibleActorIds:[],visibleCivilianIds:[],discoveredBodyIds:[]};
  applyReplayFrame(playback,hidden);
  assert.equal(replayActorVisible(playback,actor),false);
  assert.equal(replayActorVisible(playback,actor,true),true);
});

test('corpse discovery survives later loss of geometric visibility',()=>{
  const live=newSession(0),hostile=live.operators.find(a=>a.side==='red');
  assert.ok(hostile);hostile.health=0;
  live.intel.mode='full-view';
  const recorder=new MissionRecorder();recorder.capture(live,true);
  assert.ok(recorder.frames[0].knowledge?.discoveredBodyIds.includes(hostile.id));
  live.intel.mode='true-blind';
  for(const friendly of live.operators.filter(a=>a.side==='blue'))
    friendly.p={x:-5000,y:-5000};
  live.seconds=.05;recorder.capture(live);
  const later=recorder.frames.at(-1);
  assert.ok(later?.knowledge?.discoveredBodyIds.includes(hostile.id));
  assert.equal(later.knowledge.visibleActorIds.includes(hostile.id),false);
  const playback=newSession(0);applyReplayFrame(playback,later);
  assert.equal(replayBodyDiscovered(playback,hostile.id),true);
  assert.equal(recordedReplayKnowledge(playback)?.visibleActorIds.includes(hostile.id),false);
});

test('authored plans persist through frame restoration and same-tick edits',()=>{
  const live=newSession(0),friendly=live.operators.find(a=>a.side==='blue');
  assert.ok(friendly);
  const recorder=new MissionRecorder();recorder.capture(live,true);
  friendly.plan=[{id:101,kind:'move',p:{x:100,y:200}}];
  recorder.capturePlanning(live);
  const authored=recorder.plans.initial(friendly.id);
  assert.ok(authored);assert.equal(authored.nodes[0].p.x,100);
  friendly.plan[0].p.x=140;recorder.capturePlanning(live);
  assert.equal(authored.nodes[0].p.x,100);
  const latest=recorder.plans.at(friendly.id,0);
  assert.ok(latest);assert.equal(latest.nodes[0].p.x,140);
  live.seconds=.05;recorder.capture(live);
  const playback=newSession(0),frame=recorder.at(.05);
  assert.ok(frame);applyReplayFrame(playback,frame);
  assert.equal(playback.operators.find(a=>a.id===friendly.id)?.plan[0].p.x,140);
});

test('manifest retains a resolved site and actor identity; recording limit is explicit',()=>{
  const live=newSession(0,3411);
  const recorder=new MissionRecorder();recorder.capture(live,true);
  const manifest=recorder.manifest;
  assert.ok(manifest?.site);
  assert.equal(manifest.schemaVersion,2);
  assert.equal(manifest.site.seed,live.site.seed);
  assert.deepEqual(manifest.actors.map(a=>a.id),live.operators.map(a=>a.id));
  const originalName=manifest.actors[0].name;
  live.operators[0].name='TEMPORARY';
  assert.equal(manifest.actors[0].name,originalName);
  recorder.frames.length=12000;
  live.seconds=601;recorder.capture(live);
  assert.equal(recorder.completeness.complete,false);
  assert.equal(recorder.completeness.reason,'memory frame limit');
  assert.ok(recorder.completeness.truncatedAt!==null);
});
