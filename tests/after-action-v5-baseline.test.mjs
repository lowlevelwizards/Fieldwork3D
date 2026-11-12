/** V5.0 evidence baseline: these invariants must survive presentation changes.
 * Historical debrief is a read-only projection, not a gameplay scoring system.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {assessOperation} from '../src/breach-operations.ts';
import {buildAfterActionReport} from '../src/breach-after-action-report.ts';
import {buildAfterActionTimeline} from '../src/breach-after-action-timeline.ts';
import {inspectForensicEvidence} from '../src/breach-forensic-evidence.ts';

const record=()=>({
 duration:49,completeness:{complete:true},
 manifest:{actors:[
  {id:'vale',name:'VALE',side:'blue'},
  {id:'moss',name:'MOSS',side:'blue'},
  {id:'rook',name:'ROOK',side:'blue'},
  {id:'ash',name:'ASH',side:'blue'},
  {id:'guard',name:'GUARD',side:'red'}
 ]},
 frames:[{t:49,actors:[
  {id:'vale',health:0,injuryStage:2},
  {id:'moss',health:4,injuryStage:0},
  {id:'rook',health:4,injuryStage:0},
  {id:'ash',health:4,injuryStage:0}
 ]}],
 events:[
  {id:1,t:30,kind:'intel',actor:'moss',text:'CONTACT',
   meta:{action:'spot',targetId:'guard'}},
  {id:2,t:32,kind:'down',actor:'guard',text:'GUARD DOWN'},
  {id:3,t:43,kind:'objective',actor:'moss',text:'SECURED',
   meta:{action:'objective-secure',contributorId:'moss'}},
  {id:4,t:44,kind:'waiting',actor:'rook',text:'WAIT'}
 ],
 executionEvents:[{id:10,t:41,kind:'resumed',actor:'ash',
  text:'TO WAYPOINT',orderId:2}],
 ballistics:{shots:[
  {id:1,recordedAt:32,shooterId:'vale',targetId:'guard',
   hit:true,healthBefore:4,healthAfter:2,down:false,
   hitRegion:'arm',surface:'blood',start:{x:0,y:0},
   end:{x:20,y:0}},
  {id:2,recordedAt:32.5,shooterId:'vale',targetId:'guard',
   hit:true,healthBefore:2,healthAfter:2,down:false,
   hitRegion:'torso',surface:'metal',start:{x:0,y:0},
   end:{x:20,y:0}}
 ]}
});

test('V5.0 baseline: B / 86 is authoritative despite 100% accuracy',()=>{
 const score=assessOperation({outcome:'success',kind:'clear',
  elapsed:49,casualties:1,teamSize:4,shots:10,hits:10,
  objective:true,extracted:3});
 assert.deepEqual([score.grade,score.score,score.accuracy,score.survived],
  ['B',86,100,3]);
});

test('V5.0 baseline: projections are deterministic, read-only and retain links',()=>{
 const rec=record(),before=JSON.stringify(rec);
 const report=buildAfterActionReport(rec);
 const timeline=buildAfterActionTimeline(rec);
 assert.equal(JSON.stringify(rec),before);
 assert.deepEqual(report.operators.map(o=>o.id),
  ['moss','vale','ash','rook']);
 assert.deepEqual(report.operators.map(o=>o.rank),[1,2,3,3]);
 assert.equal(report.operators[1].categories.combat,3);
 assert.equal(report.operators[0].categories.objective,8);
 assert.ok(timeline.some(e=>e.key==='shot:1'&&e.shotId===1));
 assert.ok(timeline.some(e=>e.key==='execution:10'));
 assert.equal(timeline.length,7);
});

test('V5.0 baseline: uncertain limbs never become invented sided injuries',()=>{
 const rec=record(),report=buildAfterActionReport(rec);
 const target=report.hostiles[0];
 const first=inspectForensicEvidence(target,1,'selected');
 assert.equal(first.activeShot.id,1);
 // Region-only or trajectory-proxy side remains evidence-constrained.
 const side=first.activeShot.anatomy?.side??'unknown';
 if(side==='unknown'){
  assert.equal(first.unknownLimb.length,1);
  assert.equal([...first.slots.keys()].some(k=>k.startsWith('arm-')),false);
 }
 const second=inspectForensicEvidence(target,2,'cumulative');
 assert.equal(second.displayed.length,2);
 assert.equal(second.armorStops.length,1);
 assert.equal(second.damaged.length,1);
});
