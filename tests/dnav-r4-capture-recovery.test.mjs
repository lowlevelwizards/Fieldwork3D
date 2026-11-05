import test from 'node:test';
import assert from 'node:assert/strict';
import {recoveryAction} from '../src/breach-movement-recovery.ts';
import {classifyG4DMovement,summarizeG4DFlows}
 from '../src/breach-g4d-flow-audit.ts';

const movement=(patch={})=>({
 reason:'movement-stalled',mode:'true-blind',orders:2,
 nearBriefedEntrance:true,blockedFrames:0,silentDoorFrames:0,...patch
});
test('R4: a moving door briefly defers an expensive route repair',()=>{
 assert.equal(recoveryAction('door',1.1,1.2,0,{doorMoving:true}),'wait');
 assert.equal(recoveryAction('door',1.1,1.2,0,{doorMoving:false}),'replan');
 assert.equal(recoveryAction('door',2.1,1.2,0,{doorMoving:true}),'replan');
 assert.equal(recoveryAction('wall',1.1,1.2,0,{doorMoving:true}),'replan');
});
test('R4: a briefed True Blind entrance is not incorrectly declared stuck',()=>{
 assert.equal(classifyG4DMovement(movement()),'briefed-entry-only');
 assert.equal(classifyG4DMovement(movement({reason:'engaged'})),'engaged');
 assert.equal(classifyG4DMovement(movement({mode:'floor-plan'})),
  'movement-stalled');
});
test('R4: actual motor obstruction is never suppressed as quiet movement',()=>{
 assert.equal(classifyG4DMovement(movement({blockedFrames:17})),
  'movement-stalled');
 assert.equal(classifyG4DMovement(movement({silentDoorFrames:1})),
  'movement-stalled');
 assert.equal(classifyG4DMovement(movement({orders:0})),
  'movement-stalled');
 assert.equal(classifyG4DMovement(movement({nearBriefedEntrance:false})),
  'movement-stalled');
});
test('R4: audit counts only true stalls, retaining all trial integrity',()=>{
 const baseline={seed:15,mission:'capture',mode:'true-blind',orders:2,
 duration:12,friendlyTravel:16,hostileTravel:0,firstContactAt:null,
 firstShotAt:null,reason:'briefed-entry-only',blockedFrames:0,
 silentDoorFrames:0,invalidPositions:0,replayIssues:[],p95HostSimMs:4};
 const report=summarizeG4DFlows([
  baseline,{...baseline,seed:20,reason:'movement-stalled',blockedFrames:10}
 ]);
 assert.equal(report.trials,2);
 assert.equal(report.lowMovement,1);
 assert.equal(report.invalid,0);
});
