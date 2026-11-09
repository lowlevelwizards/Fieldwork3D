import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/breach-replay-mode-controller.ts',import.meta.url),'utf8');
const app=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
test('Director prepares archived film only after recorded mission state and site restore',()=>{
 const enter=source.slice(source.indexOf('function enterReplay():boolean{'),
   source.indexOf('function exitReplay():boolean{'));
 assert.ok(enter.includes('config.camera.reset(stage)'));
 assert.ok(enter.includes('config.playback.reset()'));
 assert.ok(enter.indexOf('config.getStage()?.applySite(state.site??null)')<
   enter.indexOf('config.rebuildEventIndex()'));
 assert.ok(enter.indexOf('config.setSession(config.createReplaySession(')<
   enter.indexOf('config.rebuildEventIndex()'));
 assert.match(app,/replayModeController\.enterReplay\(\)/);
});
test('replay exit delegates lifetime cleanup to its owners',()=>{
 const exit=source.slice(source.indexOf('function exitReplay():boolean{'));
 assert.ok(exit.includes('config.camera.reset(config.getStage())'));
 assert.ok(exit.includes('config.playback.reset()'));
 assert.ok(exit.includes('config.getAnalysis().reset()'));
 assert.ok(!exit.includes('replayDirector.storyboard=null'));
 assert.match(app,/replayModeController\.exitReplay\(\)/);
});
