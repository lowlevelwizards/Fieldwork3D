import test from 'node:test';
import assert from 'node:assert/strict';
import {compareD316BPhysicalReports,D316B_HISTORICAL_TARGET}
 from '../scripts/verification/d3-16b-physical-parity.mjs';
function fixture(){
 const names=['rook','moss','ash','vale'];
 const modes=['authored','entry'];
 const rows=Array.from({length:11},(_,index)=>({
  seed:31045+13*index,scale:index%2?'standard':'small',
  archetype:'motel',
  modes:modes.map(mode=>({
   mode,successful:true,accepted:4,cancelledOrders:0,arrivals:4,
   orderCancelledEvents:[],
   operators:names.map(id=>({
    id,arrived:true,failedOrders:0,lastFailedOrder:null,
    remainingOrders:0,activeOrder:null,goal:{x:30,y:50},
    position:{x:30,y:50},orderIssue:null
   }))
  }))
 }));
 return {rows,summary:{
  triageCounts:{completed:88},sites:11,exceptions:0,attempted:22,
  acceptedFour:22,completedFour:22,successfulFour:22,
  cancelledOperators:0,terminallyCancelledOrders:0,
  cancelledAndNotArrived:0,arrivedDespiteCancellation:0,
  physicallyPendingOperators:0,unreachedDrainedOperators:0,
  physicsStepViolations:0,invalidPositions:0,corruptedPlans:0,
  physicalArrivals:88
 }};
}
test('D3.16B same-base 88-person simulation passes unchanged despite old legacy quality target',()=>{
 const x=fixture(),res=compareD316BPhysicalReports(x,structuredClone(x));
 assert.equal(res.pass,true,JSON.stringify(res.problems));
 assert.equal(res.problems.length,0);
 assert.deepEqual(D316B_HISTORICAL_TARGET,{
  physicalArrivals:80,terminallyCancelledOrders:7,successfulFour:18
 });
});
test('D3.16B real actor change is detected even if aggregate counts match',()=>{
 const x=fixture(),y=structuredClone(x);
 y.rows[8].modes[0].operators[2].position.x+=6;
 const res=compareD316BPhysicalReports(x,y);
 assert.equal(res.pass,false);
 assert.match(res.problems.join(' '),/per-operator/);
});
test('D3.16B new hidden cancellation and false arrival cannot be treated as parity',()=>{
 const a=fixture(),b=structuredClone(a);
 const op=b.rows[0].modes[0].operators[0];
 op.failedOrders=1;op.lastFailedOrder={reason:'PATH BLOCKED · DOOR LOCKED'};
 b.summary.cancelledOperators=1;b.summary.terminallyCancelledOrders=1;
 b.summary.cancelledAndNotArrived=0;
 const res=compareD316BPhysicalReports(a,b);
 assert.equal(res.pass,false);
 assert.match(res.problems.join(' '),/unjustified cancellation/);
});
test('D3.16B real locked-door cancellations are valid only when both passes agree',()=>{
 const a=fixture();const op=a.rows[0].modes[0].operators[0];
 op.arrived=false;op.failedOrders=1;
 op.lastFailedOrder={reason:'PATH BLOCKED · DOOR LOCKED'};
 op.remainingOrders=0;op.activeOrder=null;
 a.summary.cancelledOperators=1;a.summary.terminallyCancelledOrders=1;
 a.summary.cancelledAndNotArrived=1;a.summary.physicalArrivals=87;
 const res=compareD316BPhysicalReports(a,structuredClone(a));
 assert.equal(res.pass,true,JSON.stringify(res.problems));
});
