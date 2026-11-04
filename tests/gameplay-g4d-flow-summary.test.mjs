import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeG4DFlows} from '../src/breach-g4d-flow-audit.ts';
const row=(patch={})=>({
 seed:11,mission:'intel',mode:'true-blind',orders:2,duration:8,
 friendlyTravel:70,hostileTravel:0,firstContactAt:null,firstShotAt:null,
 reason:'approach-still-distant',blockedFrames:0,invalidPositions:0,
 replayIssues:[],p95HostSimMs:1,...patch
});
test('G4d: quiet no-contact mission is valid and visible in report',()=>{
 const summary=summarizeG4DFlows([row()]);
 assert.equal(summary.invalid,0);
 assert.equal(summary.noContact,1);
 assert.equal(summary.byMission.intel.contact,0);
 assert.equal(summary.byMission.intel.meanTravel,70);
});
test('G4d: replay or invalid position is fatal, low movement is a warning',()=>{
 const s=summarizeG4DFlows([
  row({friendlyTravel:0}),row({seed:12,replayIssues:['bad replay']}),
  row({seed:13,invalidPositions:1})
 ]);
 assert.equal(s.lowMovement,1);
 assert.equal(s.invalid,2);
 assert.equal(s.unaccepted,0);
});
