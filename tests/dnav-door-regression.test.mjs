import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeG4DFlows} from '../src/breach-g4d-flow-audit.ts';
const sample=(patch={})=>({
 seed:16,mission:'clear',mode:'floor-plan',orders:2,duration:12,
 friendlyTravel:45,hostileTravel:0,firstContactAt:null,
 firstShotAt:null,reason:'line-of-sight-or-route-delay',
 blockedFrames:0,silentDoorFrames:0,invalidPositions:0,replayIssues:[],
 p95HostSimMs:1,...patch
});
test('DNav-C: normal unlocked-door navigation has zero silent blocked frames',()=>{
 const report=summarizeG4DFlows([sample()]);
 assert.equal(report.silentDoorFrames,0);
 assert.equal(report.invalid,0);
});
test('DNav-C: an actual locked door is retained as a visible stop, not a silent jam',()=>{
 const report=summarizeG4DFlows([sample({
  seed:19,mission:'hold',blockedFrames:201,silentDoorFrames:0,
  blockedReasons:{door:201},blockedMotorPauses:{'door-locked':201}
 })]);
 assert.equal(report.silentDoorFrames,0);
 assert.equal(report.blockedFrames,201);
});
test('DNav-C: unexpected silent blocked door-frame counts are not hidden',()=>{
 const report=summarizeG4DFlows([
  sample({blockedFrames:125,silentDoorFrames:125}),
  sample({seed:20,blockedFrames:9,silentDoorFrames:9})
 ]);
 assert.equal(report.silentDoorFrames,134);
 assert.equal(report.blockedFrames,134);
});
