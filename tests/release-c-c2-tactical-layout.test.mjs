import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {describeTacticalLayout,preferTacticalLayoutCandidate}
 from '../src/worldgen/tactical-layout-selection.ts';
import {measureSiteCompleteness} from '../src/worldgen/site-completeness.ts';
import {activateSite} from '../src/breach-core.ts';
const room={id:'a',x:0,y:0,w:160,h:150,kind:'room',purpose:'office'};
const door=(id,x)=>({id,a:{x,y:62},b:{x,y:106},open:false,openedAt:-1});
const stub=(doors,cover)=>({rooms:[room],doors,openings:[],
 cover,planFamily:'A',circulationStyle:'loop'});
test('C2: only real room access and physical cover count as opportunities',()=>{
 const empty=describeTacticalLayout(stub([door('FRONT',0)],[]));
 const actual=describeTacticalLayout(stub([door('FRONT',0),door('SERVICE-1',160)],
  [{x:50,y:65,w:42,h:28,fixture:'desk'}]));
 const tiny=describeTacticalLayout(stub([door('FRONT',0)],
  [{x:50,y:65,w:4,h:4,fixture:'plant'}]));
 assert.equal(empty.alternateEntries,0);
 assert.equal(actual.alternateEntries,1);
 assert.equal(actual.thresholdCoverRooms,1);
 assert.equal(tiny.thresholdCoverRooms,0);
 assert.equal(actual.usableEngagementRooms,1);
});
test('C2: selection of equal-contract sites is deterministic and mission-specific',()=>{
 const a=stub([door('FRONT',0)],[]);
 const b=stub([door('FRONT',0),door('SERVICE-1',160)],
  [{x:50,y:65,w:42,h:28,fixture:'desk'}]);
 for(const mission of ['clear','intel','capture','rescue','hold']){
  const outcome=preferTacticalLayoutCandidate(b,a,113,mission);
  assert.equal(outcome,preferTacticalLayoutCandidate(b,a,113,mission));
  assert.equal(outcome,true);
 }
});
test('C2: real sampled sites remain complete and seed-reproducible',()=>{
 try{
  for(const seed of [14,23,41,62,85]){
   const a=generateSite(seed,'small'),b=generateSite(seed,'small');
   assert.deepEqual(describeTacticalLayout(a),describeTacticalLayout(b));
   assert.equal(measureSiteCompleteness(a).score,
     measureSiteCompleteness(b).score);
   assert.ok(a.doors.some(d=>d.id==='FRONT'));
  }
 }finally{activateSite(null);}
});
