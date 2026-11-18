import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyD330Mainline,D330_MAINLINE_BASELINE as baseline}
 from '../scripts/lib/d3-30-physical-gate.mjs';
const audit=()=>{
 const rows=Array.from({length:11},(_,index)=>({
  seed:31000+index,archetype:'site-'+index,
  modes:['authored','entry'].map(mode=>({
   mode,operators:['rook','moss','ash','vale'].map(id=>({
    id,arrived:true,outcome:'arrived',failedOrders:0
   })),d329CancelDoorWitness:[]
  }))
 }));
 let n=0;
 for(const row of rows)for(const mode of row.modes)for(const op of mode.operators){
  if(n++>=13)continue;
  const at=5,id=n;
  Object.assign(op,{arrived:false,outcome:'cancelled',failedOrders:1,
   lastFailedOrder:{id,at,reason:'PATH BLOCKED · DOOR LOCKED'}});
  mode.d329CancelDoorWitness.push({actor:op.id,failedOrder:{id,at},
   actualSelectedDoor:{id:'D'+id,locked:true,open:false},
   initialSelectedDoor:{id:'D'+id,locked:true,open:false},
   lockedNearby:[{id:'D'+id}]});
 }
 return {ticks:2700,rows,
  summary:{acceptedFour:22,completedFour:22,physicalArrivals:75,
   physicalCompletedFour:16,cancelledAndNotArrived:13,stallEpisodes:7,retries:2},
  progressSummary:{sustainedStill:0,suspectedLoops:0},
  routeQualitySummary:{searches:2427}};
};
test('D3.30D: real locked-door baseline is not failed as ghost arrivals',()=>{
 assert.equal(baseline.arrivals,75);assert.equal(baseline.fullSquads,16);
 const verdict=verifyD330Mainline(audit());
 assert.equal(verdict.ok,true,verdict.errors.join('; '));
 assert.equal(verdict.missing.length,13);
});
test('D3.30D: an arbitrary failed move cannot borrow a locked cancellation',()=>{
 const data=audit(),op=data.rows[0].modes[0].operators[0];
 op.lastFailedOrder.reason='PATH BLOCKED · WALL';
 assert.match(verifyD330Mainline(data).errors.join(' '),/without terminal locked-door/);
});
test('D3.30D: never grant arrival credit for locked cancellation',()=>{
 const data=audit();data.summary.physicalArrivals=76;
 assert.equal(verifyD330Mainline(data).ok,false);
});
test('D3.30D: a locked leaf cannot open physically',()=>{
 const data=audit();
 data.rows[0].modes[0].d329CancelDoorWitness[0].actualSelectedDoor.open=true;
 assert.match(verifyD330Mainline(data).errors.join(' '),/illegally opened/);
});
test('D3.30D: no unseen physical witness and no regression passes',()=>{
 const data=audit();data.rows[0].modes[0].d329CancelDoorWitness=[];
 assert.match(verifyD330Mainline(data).errors.join(' '),/without physical obstruction/);
 data.summary.physicalArrivals=74;
 assert.match(verifyD330Mainline(data).errors.join(' '),/arrival regression/);
});
