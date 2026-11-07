import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {captureReplayArchive,replayArchiveIsValid,restoreReplayArchive}
  from '../src/breach-replay-archive.ts';
import {ReplayWindowObservationRecorder,ReplayWindowKnowledgeHistory}
  from '../src/breach-replay-window-knowledge.ts';

test('window state changes are invisible until personally witnessed',()=>{
  const s=newSession(0,3411),ops=s.operators.filter(a=>a.side==='blue');
  assert.ok(ops.length>=2);
  const window=s.windows[0]??{
    id:'PW',x:50,y:50,open:false,shattered:false
  };
  if(!s.windows.length)s.windows.push(window);
  let visible=true;
  const recorder=new ReplayWindowObservationRecorder();
  const canSee=(_s,observer,w)=>
    visible&&observer.id===ops[0].id&&w.id===window.id;
  recorder.capture(s,canSee);
  const first=recorder.observations[0];
  assert.equal(first.open,false);
  window.open=true;window.shattered=true;
  visible=false;s.seconds=.14;recorder.capture(s,canSee);
  assert.equal(recorder.observations.length,1);
  visible=true;s.seconds=.28;recorder.capture(s,canSee);
  assert.equal(recorder.observations.length,2);
  const h=new ReplayWindowKnowledgeHistory(recorder.observations);
  assert.equal(h.at(.20,ops[0].id,window.id).shattered,false);
  assert.equal(h.at(.28,ops[0].id,window.id).shattered,true);
  assert.equal(h.at(.28,ops[1].id,window.id),null);
  assert.equal(h.at(-.1,ops[0].id,window.id),null);
  assert.equal(h.at(.20,ops[0].id,window.id).open,false);
});
test('window observations deduplicate unchanged state at the sampling cadence',()=>{
  const s=newSession(0,3411);
  if(!s.windows.length)
    s.windows.push({id:'PW',x:10,y:20,open:false,shattered:false});
  const observer=s.operators.find(a=>a.side==='blue');
  const record=new ReplayWindowObservationRecorder();
  const canSee=(_s,a,w)=>a.id===observer.id&&w.id===s.windows[0].id;
  for(let i=0;i<30;i++){
    s.seconds=i/20;record.capture(s,canSee);
  }
  assert.equal(record.observations.length,1);
  assert.equal(new ReplayWindowKnowledgeHistory([]).at(0,observer.id,'PW'),null);
});

test('personal window changes survive archives; missing and corrupt journals fail closed',()=>{
  const s=newSession(0,3411);
  const rec=new MissionRecorder();
  rec.capture(s,true);s.seconds=.05;rec.capture(s);
  const archive=captureReplayArchive(rec,'bodycam-windows',12345);
  assert.equal(replayArchiveIsValid(archive),true);
  assert.deepEqual(restoreReplayArchive(archive).windowKnowledge.observations,
    rec.windowKnowledge.observations);
  const old=structuredClone(archive);
  delete old.personalWindows;
  assert.equal(replayArchiveIsValid(old),true);
  assert.deepEqual(restoreReplayArchive(old).windowKnowledge.observations,[]);
  const bad=structuredClone(archive);
  bad.personalWindows=[{at:.01,observerId:'rook',windowId:'W0',
    open:'yes',shattered:false}];
  assert.equal(replayArchiveIsValid(bad),false);
  bad.personalWindows=[{at:100,observerId:'rook',windowId:'W0',
    open:false,shattered:false}];
  assert.equal(replayArchiveIsValid(bad),false);
});
