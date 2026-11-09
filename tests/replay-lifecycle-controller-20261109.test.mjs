import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
test('Director prepares archived film only after recorded mission state and site restore',()=>{
 const enter=source.slice(source.indexOf('function enterReplay(){'),source.indexOf('function exitReplay(){'));
 assert.ok(enter.includes('replayCamera.reset(stage)'));
 assert.ok(enter.includes('replayPlayback.reset()'));
 assert.ok(enter.indexOf('stage?.applySite(state.site??null)')<enter.indexOf('rebuildReplayEventIndex()'));
 assert.ok(enter.indexOf('state=newSession(')<enter.indexOf('rebuildReplayEventIndex()'));
});
test('replay exit delegates lifetime cleanup to its owners',()=>{
 const exit=source.slice(source.indexOf('function exitReplay(){'),source.indexOf('const replayLibrary=createReplayLibraryUi'));
 assert.ok(exit.includes('replayCamera.reset(stage)'));
 assert.ok(exit.includes('replayPlayback.reset()'));
 assert.ok(!exit.includes('replayDirector.storyboard=null'));
});
