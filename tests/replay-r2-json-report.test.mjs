import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {buildReplayReport,serializeReplayReport}
  from '../src/breach-replay-export-json.ts';

test('JSON report round-trips mission identity and transparent completeness',()=>{
  const session=newSession(0,3411),recorder=new MissionRecorder();
  recorder.capture(session,true);
  session.seconds=.05;
  session.shots=[{
    id:7,shooterId:'rook',targetId:null,side:'blue',
    start:{x:1,y:2},end:{x:8,y:9},age:0,hit:false,
    healthBefore:4,healthAfter:4,down:false,surface:'stone'
  }];
  recorder.capture(session);
  const report=buildReplayReport(recorder);
  assert.equal(report.format,'fieldwork-breach-report');
  assert.equal(report.disclosure,'full-reconstruction');
  assert.equal(report.mission.siteSeed,3411);
  assert.equal(report.shots.length,1);
  assert.equal(report.shots[0].end.x,8);
  const parsed=JSON.parse(serializeReplayReport(recorder));
  assert.equal(parsed.schemaVersion,2);
  assert.equal(parsed.shots[0].precision,'region-only');
  assert.ok('nominalCaliberAtFire' in parsed.shots[0]);
  assert.equal(parsed.operators.find(a=>a.id==='rook')?.shotsFired,1);
  assert.equal(parsed.completeness.complete,true);
});
