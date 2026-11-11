import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBreachAppFlow} from '../src/breach-app-flow.ts';
import {makeAfterActionLaunchRequest}
 from '../src/breach-after-action-replay-navigation.ts';
import {ReplayPlaybackController}
 from '../src/breach-replay-playback-controller.ts';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const rec={duration:60,ballistics:{shots:[
 {id:1,recordedAt:12,targetId:'guard'},
 {id:2,recordedAt:17,targetId:'guard'},
 {id:3,recordedAt:19,targetId:'rook'},
 {id:4,recordedAt:20,targetId:null}
]}};

test('V4-1: an individual shot gets one playable context window, never a zero-length film',()=>{
 const raw=makeAfterActionLaunchRequest(rec,{
  surface:'combat',contactId:'guard',shotId:2,time:17});
 assert.deepEqual(raw.range,{start:17,end:17},
  'Launch anchor is the recorded event, not fabricated padded time');
 const transport=new ReplayPlaybackController();
 assert.equal(transport.startIncident(raw.range,rec.duration,true,true),true);
 assert.deepEqual(transport.incident.range,{start:14,end:22},
  'Playback applies its existing lead and tail exactly once');
 assert.equal(transport.unclipIncident(),true);
 transport.seek(43,rec.duration);
 assert.equal(transport.reclipIncident(),true);
 assert.equal(transport.time,22);
 assert.equal(transport.incident.scoped,true);
});

test('V4-1: a contact selection cannot open another actor\'s shot',()=>{
 assert.equal(makeAfterActionLaunchRequest(rec,{
  surface:'combat',contactId:'guard',shotId:3,time:19}),null);
 assert.equal(makeAfterActionLaunchRequest(rec,{
  surface:'combat',contactId:'guard',shotId:800,time:19}),null);
 assert.deepEqual(makeAfterActionLaunchRequest(rec,{
  surface:'combat',shotId:4,time:20}).range,{start:20,end:20},
  'A recorded miss without a contact still has a valid anchor');
 assert.deepEqual(makeAfterActionLaunchRequest(rec,{
  surface:'combat',contactId:'guard',time:12}).range,{start:12,end:17});
});

test('V4-1: incident anchors preserve real recorded bounds and reject malformed evidence',()=>{
 assert.deepEqual(makeAfterActionLaunchRequest(rec,{
  surface:'highlights',time:9,end:16}).range,{start:9,end:16});
 for(const anchor of [
  {surface:'highlights',time:20,end:19},
  {surface:'highlights',time:20,end:NaN},
  {surface:'combat',time:-1},
  {surface:'combat',time:99}
 ])assert.equal(makeAfterActionLaunchRequest(rec,anchor),null);
 const limit=makeAfterActionLaunchRequest(rec,{
  surface:'highlights',time:0,end:60});
 const transport=new ReplayPlaybackController();
 assert.equal(transport.startIncident(limit.range,rec.duration,true,true),true);
 assert.deepEqual(transport.incident.range,{start:0,end:60});
});

test('V4-1: app-flow replay returns are explicit; failed authorization never creates replay',()=>{
 const flow=createBreachAppFlow('quick');
 flow.observePhase('won');
 assert.equal(flow.surface,'debrief');
 assert.equal(flow.beginReplay('debrief'),true);
 flow.observePhase('planning');
 assert.equal(flow.surface,'replay');
 assert.equal(flow.exitReplay(),true);
 assert.equal(flow.surface,'debrief');
 flow.setMode('menu');
 assert.equal(flow.beginReplay('debrief'),false);
 assert.equal(flow.surface,'menu');
});

test('V4-1: debrief entry, snapshot and cleanup remain with existing owners',()=>{
 const main=read('src/breach-main.ts');
 const ui=read('src/ui/breach-after-action-controller.ts');
 const squad=read('src/ui/breach-after-action-squad.ts');
 assert.match(main,/if\(!appFlow\.beginReplay\(source\)\)return false/);
 assert.match(main,/if\(!replayModeController\.enterReplay\(\)\)\{/);
 assert.match(main,/afterActionReturn=null;/);
 assert.match(main,/if\(!restoreAfterActionWorkspace\(ui\.debrief,origin\)/);
 assert.match(ui,/operatorRecordOpen:s\.operatorRecordOpen/);
 assert.match(ui,/s\.operatorRecordOpen=context\.operatorRecordOpen/);
 assert.match(ui,/port\.setReturn\(origin\)/);
 assert.match(ui,/port\.exitReplay\(\)/);
 assert.doesNotMatch(ui,/afterActionDetailsToggle'\)\?\.click\(\)/,
  'Full Operator Record must never open generic mission details');
 assert.match(ui,/afterActionOperatorRecord/);
 assert.match(squad,/OBJECTIVE CONTRIBUTION/);
 assert.match(squad,/COMBAT CONTRIBUTION/);
 assert.match(squad,/TOTAL RECORDED CONTRIBUTION/);
 assert.match(squad,/NOT RECORDED/);
});
