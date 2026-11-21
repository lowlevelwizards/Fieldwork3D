import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyFrozenD315B4,verifyCourtPhysicalTruth,verifyRetailPhysicalTruth,
 FROZEN_D315B4_TRUTH as baseline}
 from '../scripts/verification/ci-d3-physical-truth.mjs';

const actors=()=>['rook','moss','ash','vale'].map(id=>({
 id,arrived:true,outcome:'arrived',remainingOrders:0,failedOrders:0
}));
function frozen(){
 const rows=Array.from({length:22},(_,i)=>({
  seed:13000000+i,archetype:'site-'+i,
  modes:['authored','entry'].map(mode=>({
   mode,accepted:4,complete:true,arrivals:4,operators:actors(),
   d329CancelDoorWitness:[],progressEvidence:[]
  }))
 }));
 return {corpus:baseline.corpus,ticks:2700,rows,
  summary:{physicalArrivals:176,physicalCompletedFour:44,
   cancelledAndNotArrived:0,physicallyPendingOperators:0,
   unreachedDrainedOperators:0,stallEpisodes:0,retries:0},
  progressSummary:{suspectedLoops:0}};
}
function cancel(data,reason='PATH BLOCKED · DOOR LOCKED',witness=true){
 const mode=data.rows[0].modes[0],operator=mode.operators[0],id=8,at=4;
 Object.assign(operator,{arrived:false,failedOrders:1,outcome:'cancelled',
  lastFailedOrder:{id,reason,at}});
 mode.arrivals--;
 data.summary.physicalArrivals--;
 data.summary.physicalCompletedFour--;
 data.summary.cancelledAndNotArrived++;
 if(witness)mode.d329CancelDoorWitness.push({
  actor:operator.id,failedOrder:{id,at},
  actualSelectedDoor:{id:'D7',locked:true,open:false},
  initialSelectedDoor:{id:'D7',locked:true,open:false},
  lockedNearby:[{id:'D7'}]
 });
}

test('A3 modern frozen gate accepts genuinely arrived physical full corpus',()=>{
 const result=verifyFrozenD315B4(frozen());
 assert.equal(result.ok,true,result.errors.join('; '));
 assert.equal(result.observed.arrivals,176);
 assert.equal(result.observed.loopIncidents,0);
});
test('A3 modern frozen gate accepts witnessed locked non-arrival but never credits as arrival',()=>{
 const r=frozen();cancel(r);
 const result=verifyFrozenD315B4(r);
 assert.equal(result.ok,true,result.errors.join('; '));
 assert.equal(result.observed.locked,1);
 assert.equal(result.observed.arrivals,175);
});
test('A3 missing lock witness, physical safety violation and unproven cancellation fail closed',()=>{
 for(const variant of ['no-witness','wrong-reason','invalid-position','open-leaf']){
  const r=frozen();cancel(r,variant==='wrong-reason'?'PATH BLOCKED · WALL':
   'PATH BLOCKED · DOOR LOCKED',variant!=='no-witness');
  if(variant==='invalid-position')r.summary.invalidPositions=1;
  if(variant==='open-leaf')r.rows[0].modes[0].d329CancelDoorWitness[0]
   .actualSelectedDoor.open=true;
  const result=verifyFrozenD315B4(r);
  assert.equal(result.ok,false,variant);
 }
});
test('A3 rejected entry with no authored plan is not a movement success or deadlock',()=>{
 const r=frozen(),mode=r.rows[0].modes[1];
 mode.accepted=0;mode.complete=false;mode.arrivals=0;
 for(const op of mode.operators){op.arrived=false;op.outcome='unreached';}
 r.summary.physicalArrivals-=4;
 r.summary.physicalCompletedFour--;
 r.summary.unreachedDrainedOperators=4;
 const result=verifyFrozenD315B4(r);
 assert.equal(result.ok,true,result.errors.join('; '));
 assert.equal(result.observed.unplanned,4);
});
test('A3 unresolved submitted MOVE cannot turn into a drained phantom arrival',()=>{
 const r=frozen(),mode=r.rows[0].modes[0],op=mode.operators[0];
 op.arrived=false;op.outcome='unreached';op.remainingOrders=0;
 mode.arrivals--;r.summary.physicalArrivals--;r.summary.physicalCompletedFour--;
 r.summary.unreachedDrainedOperators=1;
 assert.match(verifyFrozenD315B4(r).errors.join('; '),/unexplained drained/);
});
test('A3 unknown frozen corpus and unexplained extra pending orders are rejected',()=>{
 const r=frozen();r.corpus='not-the-frozen-physical-corps';
 assert.match(verifyFrozenD315B4(r).errors.join('; '),/wrong frozen/);
});
function oneCase(seed,archetype,actor,sources){
 return {ticks:2700,rows:[{seed,archetype,modes:[{
  mode:'authored',accepted:4,arrivals:4,operators:actors(),
  routeTransitions:{byActor:{[actor+':'+sources]:1}}
 }]}],summary:{cancelledAndNotArrived:0},
 progressSummary:{suspectedLoops:0}};
}
test('A3 exact COURT-1 proves physical Ash rejoin and truthful four-person arrival',()=>{
 const r=oneCase(14462973,'utility','ash','door-rehearsal-joined-waypoint');
 assert.equal(verifyCourtPhysicalTruth(r).ok,true);
 r.rows[0].modes[0].operators.find(x=>x.id==='ash').arrived=false;
 assert.equal(verifyCourtPhysicalTruth(r).ok,false);
});
test('A3 original retail 45s physical portal rejoin remains a real required gate',()=>{
 const r=oneCase(5412896,'retail','rook','door-rehearsal-world');
 assert.equal(verifyRetailPhysicalTruth(r).ok,true);
 r.rows[0].modes[0].routeTransitions.byActor={};
 assert.equal(verifyRetailPhysicalTruth(r).ok,false);
});
