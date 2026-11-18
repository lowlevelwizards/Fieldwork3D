import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyD329Cancellation,analyzeD329CancellationAudit}
 from '../scripts/lib/d3-29-cancellation-classifier.mjs';
const actor=(id='ash')=>({id,arrived:false,outcome:'cancelled',
 failedOrders:1,remainingOrders:0,
 position:{x:100,y:100},goal:{x:200,y:200},
 lastFailedOrder:{id:22,kind:'open',reason:'cancelled',at:20}});
test('D3.29A: physical locked door is NOT a recoverable arrival',()=>{
 const mode={mode:'entry',doorId:'D8',
  endDoorStates:[{id:'D8',locked:true,open:false,fraction:0}]};
 const row=classifyD329Cancellation(mode,actor());
 assert.equal(row.family,'physically-locked-door');
 assert.equal(row.physicallyArrived,false);
 assert.equal(row.lastFailedOrder.kind,'open');
});
test('D3.29A: fully open leaf cancellation is a review target, not success',()=>{
 const mode={mode:'entry',doorId:'FRONT',
  endDoorStates:[{id:'FRONT',open:true,fraction:1,locked:false}]};
 const row=classifyD329Cancellation(mode,actor('moss'));
 assert.equal(row.family,'entry-cancelled-after-open-door');
 assert.equal(row.distanceToOriginalGoal,141.42);
 assert.equal(row.physicallyArrived,false);
});
test('D3.29B: actual locked interior door differs from open briefing FRONT',()=>{
 const a=actor('moss');
 const mode={mode:'entry',doorId:'FRONT',
  endDoorStates:[{id:'FRONT',open:true,fraction:1,locked:false}],
  d329CancelDoorWitness:[{actor:'moss',seconds:20,
   failedOrder:{id:22,kind:'open',reason:'PATH BLOCKED · DOOR LOCKED',at:20},
   selectedDoorId:'D5',
   actualSelectedDoor:{id:'D5',locked:true,open:false,fraction:0},
   lockedNearby:[{id:'D5',distance:2}]}]};
 const row=classifyD329Cancellation(mode,a);
 assert.equal(row.family,'entry-cancelled-after-open-door');
 assert.equal(row.interveningDoor,true);
 assert.equal(row.lockedMotorDoorVerified,true);
 assert.equal(row.selectedMotorDoor.id,'D5');
 assert.equal(row.door.id,'FRONT');
 assert.equal(row.physicallyArrived,false);
});
test('D3.29A: authored cancelled route has separate bucket',()=>{
 const mode={mode:'authored',doorId:null,endDoorStates:[]};
 const row=classifyD329Cancellation(mode,actor('rook'));
 assert.equal(row.family,'authored-door-order-cancellation');
 assert.equal(classifyD329Cancellation(mode,{...actor(),arrived:true}),null);
});
const fixture=()=>{
 const rows=Array.from({length:22},(_,i)=>({
  archetype:'site'+i,seed:19100000+i,scale:'standard',
  modes:['authored','entry'].map(kind=>({
   mode:kind,doorId:kind==='entry'?'FRONT':null,
   accepted:4,arrivals:4,
   endDoorStates:kind==='entry'?[{id:'FRONT',open:true,
    fraction:1,locked:false,jammed:false}]:[],
   operators:['rook','moss','ash','vale'].map(id=>({
    ...actor(id),arrived:true,outcome:'arrived',failedOrders:0
   }))
  }))
 }));
 // 7 incomplete squads, 15 true terminal cancellations.
 const sites=[[10,1,4,'locked'],[11,0,2,'authored'],
 [13,1,3,'open'],[15,0,2,'authored'],
 [18,0,1,'authored'],[19,0,2,'authored'],
 [20,0,1,'authored']];
 for(const [i,mode,count,which] of sites){
  const m=rows[i].modes[mode];
  if(which==='locked'){
   m.doorId='D8';m.endDoorStates=[{id:'D8',locked:true,open:false,fraction:0}];
  }
  if(which==='open'){m.doorId='FRONT';}
  for(let j=0;j<count;j++)m.operators[j]=actor(m.operators[j].id);
  m.arrivals-=count;
 }
 return {ticks:2700,corpus:'d3-18-eleventh-fresh22-20261115',
  rows,summary:{physicalArrivals:161,physicalCompletedFour:37},
  progressSummary:{suspectedLoops:0},routeQualitySummary:{searches:6200}};
};
test('D3.29A: independent 176-actor census keeps all 15 cancellations',()=>{
 const data=analyzeD329CancellationAudit(fixture());
 assert.equal(data.cases.length,15);
 assert.deepEqual(data.summary.byFamily,{
  'entry-cancelled-after-open-door':3,
  'authored-door-order-cancellation':8,
  'physically-locked-door':4
 });
 assert.equal(data.summary.arrivals,161);
 assert.equal(data.summary.fullSquads,37);
 assert.equal(data.cases.every(c=>c.physicallyArrived===false),true);
});
test('D3.29A: never accept fabricated arrivals or invalid physics',()=>{
 const data=fixture();data.summary.physicalArrivals=162;
 assert.throws(()=>analyzeD329CancellationAudit(data),/disagree/);
 const invalid=fixture();invalid.summary.invalidPositions=1;
 assert.throws(()=>analyzeD329CancellationAudit(invalid),/integrity/);
});
