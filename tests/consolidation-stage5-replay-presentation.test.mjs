import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  createReplayPresentationOptions,INITIAL_REPLAY_PRESENTATION_OPTIONS,
  REPLAY_ENTRY_PRESENTATION_OPTIONS
} from '../src/breach-replay-presentation-options.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const pick=o=>({...o});
const fields=['replayXrayOn','replayAnalysis','replayPlanScope',
 'replayPlanVersion','replayNameTags','replayContactMarkers',
 'replayObjectiveMarkers','replayTraceMode','replayGhostMode',
 'replayTrailMode','replayPreset'];

test('A5 initial, in-replay and post-mission defaults preserve existing behavior',()=>{
 const state=createReplayPresentationOptions();
 assert.deepEqual(Object.keys(state.options).sort(),fields.sort());
 assert.deepEqual(state.options,{
  replayXrayOn:false,replayAnalysis:false,replayPlanScope:'selected',
  replayPlanVersion:'active',replayNameTags:true,
  replayContactMarkers:true,replayObjectiveMarkers:true,
  replayTraceMode:'off',replayGhostMode:'off',replayTrailMode:'off',
  replayPreset:'clean'
 });
 assert.strictEqual(state.options,INITIAL_REPLAY_PRESENTATION_OPTIONS);
 const replay=state.resetForReplay();
 assert.strictEqual(replay,REPLAY_ENTRY_PRESENTATION_OPTIONS);
 assert.equal(replay.replayXrayOn,true);
 assert.equal(replay.replayPlanScope,'none');
 assert.equal(replay.replayPlanVersion,'active');
 assert.equal(replay.replayNameTags,true);
 assert.equal(replay.replayContactMarkers,true);
 assert.equal(replay.replayObjectiveMarkers,true);
 assert.equal(replay.replayPreset,'clean');
 assert.strictEqual(state.resetForMission(),INITIAL_REPLAY_PRESENTATION_OPTIONS);
});

test('A5 display snapshots are read-only and stable across idle render frames',()=>{
 const state=createReplayPresentationOptions();
 const before=state.options;
 assert.ok(Object.isFrozen(before));
 assert.strictEqual(state.options,before);
 assert.strictEqual(state.patch({replayNameTags:true}),before,'no-op patch does not allocate');
 const next=state.patch({replayNameTags:false});
 assert.ok(Object.isFrozen(next));
 assert.notStrictEqual(next,before);
 assert.equal(before.replayNameTags,true,'past frame remains unmodified');
 assert.equal(next.replayNameTags,false);
 assert.strictEqual(state.options,next);
 assert.strictEqual(state.patch({}),next);
});

test('A5 Clean retains cutaway, plan version and knowledge-independent fields',()=>{
 const state=createReplayPresentationOptions();
 state.resetForReplay();
 state.patch({replayXrayOn:false,replayPlanVersion:'original',
  replayAnalysis:true,replayPlanScope:'all',replayNameTags:true,
  replayContactMarkers:true,replayObjectiveMarkers:true,
  replayTraceMode:'selected',replayGhostMode:'squad',replayTrailMode:'full'});
 const after=state.applyPreset('clean');
 assert.deepEqual(pick(after),{
  replayXrayOn:false,replayAnalysis:false,replayPlanScope:'none',
  replayPlanVersion:'original',replayNameTags:false,
  replayContactMarkers:false,replayObjectiveMarkers:false,
  replayTraceMode:'off',replayGhostMode:'off',replayTrailMode:'off',
  replayPreset:'clean'
 });
 assert.equal(state.options.replayXrayOn,false);
 assert.equal(state.options.replayPlanVersion,'original');
});

test('A5 Movement preset only modifies the historical movement display fields',()=>{
 const state=createReplayPresentationOptions();
 state.resetForReplay();
 state.patch({replayNameTags:false,replayContactMarkers:false,
  replayObjectiveMarkers:false,replayPlanVersion:'original',
  replayXrayOn:false,replayTraceMode:'selected',
  replayGhostMode:'squad',replayTrailMode:'full'});
 const result=state.applyPreset('movement');
 assert.equal(result.replayPreset,'movement');
 assert.equal(result.replayAnalysis,true);
 assert.equal(result.replayPlanScope,'selected');
 assert.equal(result.replayPlanVersion,'active');
 assert.equal(result.replayTraceMode,'off');
 assert.equal(result.replayGhostMode,'off');
 assert.equal(result.replayTrailMode,'recent');
 assert.equal(result.replayNameTags,false);
 assert.equal(result.replayContactMarkers,false);
 assert.equal(result.replayObjectiveMarkers,false);
 assert.equal(result.replayXrayOn,false);
});

test('A5 Combat and Visibility presets preserve labels, cutaway and plan-version',()=>{
 const state=createReplayPresentationOptions();
 state.resetForReplay();
 state.patch({replayNameTags:false,replayContactMarkers:false,
  replayObjectiveMarkers:false,replayPlanVersion:'original',replayXrayOn:false,
  replayAnalysis:true,replayPlanScope:'all',replayTraceMode:'selected',
  replayGhostMode:'squad',replayTrailMode:'full'});
 const combat=state.applyPreset('combat');
 assert.equal(combat.replayPreset,'combat');
 assert.equal(combat.replayAnalysis,false);
 assert.equal(combat.replayPlanScope,'none');
 assert.equal(combat.replayTraceMode,'recent');
 assert.equal(combat.replayGhostMode,'off');
 assert.equal(combat.replayTrailMode,'off');
 assert.equal(combat.replayNameTags,false);
 assert.equal(combat.replayPlanVersion,'original');
 assert.equal(combat.replayXrayOn,false);
 const visibility=state.applyPreset('visibility');
 assert.equal(visibility.replayPreset,'visibility');
 assert.equal(visibility.replayTraceMode,'off');
 assert.equal(visibility.replayPlanScope,'none');
 assert.equal(visibility.replayXrayOn,false);
 assert.equal(visibility.replayPlanVersion,'original');
 assert.equal(visibility.replayContactMarkers,false);
});

test('A5 Custom and overlay clear do not mutate unrequested presentation fields',()=>{
 const state=createReplayPresentationOptions();
 state.resetForReplay();
 state.setPreset('custom');
 const saved=state.options;
 assert.equal(saved.replayPreset,'custom');
 const cleared=state.clearOverlays();
 assert.equal(cleared.replayPreset,'custom');
 assert.equal(cleared.replayXrayOn,true);
 assert.equal(cleared.replayPlanVersion,'active');
 assert.equal(cleared.replayPlanScope,'none');
 assert.equal(cleared.replayNameTags,false);
 assert.strictEqual(state.setPreset('custom'),cleared,'repeat Custom is a no-op');
 state.patch({replayNameTags:true,replayPlanScope:'selected'});
 assert.equal(state.options.replayPreset,'custom');
});

test('A5 replay reset prevents prior film overlay/preset bleed; mission reset clears cutaway',()=>{
 const state=createReplayPresentationOptions();
 state.resetForReplay();
 state.applyPreset('movement');
 state.setPreset('custom');
 state.patch({replayXrayOn:false,replayPlanVersion:'original'});
 assert.equal(state.resetForReplay().replayPreset,'clean');
 assert.equal(state.options.replayPlanVersion,'active');
 assert.equal(state.options.replayXrayOn,true);
 assert.equal(state.options.replayTrailMode,'off');
 state.applyPreset('visibility');
 assert.equal(state.resetForMission().replayXrayOn,false);
 assert.equal(state.options.replayPlanScope,'selected');
 state.resetForReplay();
 assert.deepEqual(state.options,REPLAY_ENTRY_PRESENTATION_OPTIONS);
});

test('A5 store cannot inspect actors, fog, replay historical samples or DOM',()=>{
 const text=source('src/breach-replay-presentation-options.ts');
 assert.doesNotMatch(text,/\b(?:window|document|localStorage|sessionWorldGeometry|stepSession|MissionRecorder|ReplayKnowledgeController|omniscient|observerId|recordedAt|bodycam|newSession)\b/);
 assert.doesNotMatch(text,/^import /m);
 assert.match(text,/Object\.freeze/);
});

test('A5 all rendering and HUD consumers bind one immutable options snapshot',()=>{
 const main=source('src/breach-main.ts');
 const hud=source('src/ui/breach-replay-hud-controller.ts');
 const analysis=source('src/ui/breach-replay-analysis-controller.ts');
 assert.match(main,/const replayDisplay=createReplayPresentationOptions\(\)/);
 assert.match(main,/presentationOptions:replayDisplay,/);
 assert.match(main,/presentationOptions:replayDisplay\.options/);
 assert.match(main,/getFrame:\(\)=>\(\{state,replaying,selected,\.\.\.replayDisplay\.options,viewMode\}\)/);
 assert.match(main,/replayDisplay\.resetForReplay\(\)/);
 assert.match(main,/replayDisplay\.resetForMission\(\)/);
 assert.match(main,/replayDisplay\.clearOverlays\(\)/);
 assert.match(main,/replayDisplay\.applyPreset\(next\)/);
 assert.match(main,/stage\?\.setReplayXray\(false\)/);
 assert.match(hud,/presentationOptions:ReplayPresentationOptions/);
 assert.match(hud,/replayPreset\}=presentationOptions/);
 assert.match(analysis,/get replayPreset\(\)\{return presentationOptions\.options\.replayPreset;\}/);
 assert.match(analysis,/set replayPreset\(value:ReplayPreset\)\{presentationOptions\.setPreset\(value\);\}/);
 for(const legacy of [
  /let replayXrayOn=false/,/let replayAnalysis=false/,
  /let replayPlanScope:/,/let replayPlanVersion:/,/let replayNameTags=/,
  /let replayContactMarkers=/,/let replayObjectiveMarkers=/,
  /let replayTraceMode:/,/let replayGhostMode:/,/let replayTrailMode:/
 ])assert.doesNotMatch(main,legacy);
 assert.doesNotMatch(analysis,/let replayPreset:/);
});

test('A5 visibility presets leave recorded sight/observer and playback untouched',()=>{
 const main=source('src/breach-main.ts');
 const preset=main.slice(main.indexOf('function applyReplayPreset('),
  main.indexOf('function populateReplayInspectActors()'));
 assert.match(preset,/replayDisplay\.applyPreset\(next\)/);
 assert.doesNotMatch(preset,/replayKnowledge\.omniscient=|replayKnowledge\.observerId=|replayPlayback\.(?:seek|reset|time)/);
 const replayMode=source('src/breach-replay-mode-controller.ts');
 assert.match(replayMode,/config\.knowledge\.prepare\(recorder\)/);
 assert.match(replayMode,/config\.setMovementHistory\(new ReplayMovementHistory/);
 assert.match(replayMode,/config\.resetReplayOptions\(\)/);
 const mainReplay=main.slice(main.indexOf('const replayModeController=createReplayModeController'),
  main.indexOf("function enterReplay(",main.indexOf('const replayModeController=')));
 assert.match(mainReplay,/resetReplayOptions:\(\)=>\{replayDisplay\.resetForReplay\(\);\}/);
 assert.match(mainReplay,/setXray:enabled=>\{[\s\S]*?stage\?\.setReplayXray\(enabled\)/);
});

test('A5 after-action return and archive navigation still owned by existing controllers',()=>{
 const main=source('src/breach-main.ts');
 const after=main.slice(main.indexOf('function exitReplay()'),
  main.indexOf('let replayLibrary',main.indexOf('function exitReplay()')));
 assert.match(after,/restoreAfterActionWorkspace\(ui\.debrief,origin\)/);
 assert.match(main,/appFlow\.exitReplay\(\)/);
 const library=source('src/ui/breach-replay-library-controller.ts');
 assert.match(library,/entrySource='library'/);
 assert.match(library,/afterReplayExit/);
 assert.match(main,/replayLibrary\.afterReplayExit\(\)/);
});
