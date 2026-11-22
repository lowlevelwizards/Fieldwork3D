import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyA8PhysicalCohort,A8_CURRENT_FROZEN_TRUTH as frozenPolicy}
 from '../scripts/verification/ci-a8-physical-acceptance.mjs';
import {classifyPhysicalCohort}
 from '../scripts/verification/ci-physical-cohort-provenance.mjs';

/** Build an exact-shaped, deterministic REAL BODY record: lock proof is a
 * physical cancellation witness, never a synthetic arrival. The old 80,
 * 81 and 158 floors must fail on these truthful event-matched cohorts.
 */
function corpus(kind){
 const isHistory=kind==='historical11',isFresh=kind==='fresh22',
  isFrozen=kind==='frozen22';
 const sites=isHistory?11:22;
 const modes=sites*2;
 const rows=Array.from({length:sites},(_,i)=>({
  seed:14000000+i,archetype:'generated-site',
  scale:'standard',modes:['authored','entry'].map(mode=>({
   mode,accepted:4,complete:true,arrivals:4,
   operators:['rook','moss','ash','vale'].map(id=>({
    id,arrived:true,outcome:'arrived',remainingOrders:0,
    failedOrders:0,remaining:2
   })),d329CancelDoorWitness:[],progressEvidence:[]
  }))
 }));
 const flattened=rows.flatMap(row=>row.modes);
 const lockedModeCounts=isHistory?[4,4,2,1,1]:
  isFresh?[4,4,4,4,2,1,1,1,1]:
   [4,4,4,2,2,1,1,1,1,1,1];
 let lockCount=0;
 for(let m=0;m<lockedModeCounts.length;m++){
  const mode=flattened[m];
  for(let j=0;j<lockedModeCounts[m];j++){
   const op=mode.operators[j],id=10+m*4+j,at=5+j;
   Object.assign(op,{arrived:false,outcome:'cancelled',
    failedOrders:1,remainingOrders:0,
    lastFailedOrder:{id,at,reason:'PATH BLOCKED · DOOR LOCKED'}});
   mode.d329CancelDoorWitness.push({actor:op.id,
    failedOrder:{id,at},
    actualSelectedDoor:{id:'REAL_LOCK',locked:true,open:false},
    initialSelectedDoor:{id:'REAL_LOCK',locked:true,open:false},
    lockedNearby:[{id:'REAL_LOCK'}]});
   lockCount++;
  }
  mode.arrivals-=lockedModeCounts[m];
 }
 if(isFrozen){
  // The eight other bodies truly have NO accepted authored order: they
  // are not locks, arrivals, pending actors or unknown false successes.
  for(let m=11;m<13;m++){
   const mode=flattened[m];
   mode.accepted=0;mode.complete=false;mode.arrivals=0;
   for(const a of mode.operators)
    Object.assign(a,{arrived:false,outcome:'unreached',
     remainingOrders:0});
  }
  // Other submitted orders are fully drained, but this is no reason to
  // count deliberately unplanned ENTRY modes as physical squad success.
  flattened[13].complete=false;
  flattened[0].progressEvidence.push({
   actor:'rook',classification:'movement-loop',suspicious:true,
   seconds:10,position:{x:20,y:20},travel:10,net:2,
   goalReduction:2,remaining:20
  });
 }
 const unplanned=isFrozen?8:0;
 const arrivals=sites*8-lockCount-unplanned;
 const full=modes-lockedModeCounts.length-(isFrozen?2:0);
 const s={
  acceptedFour:modes-(isFrozen?2:0),
  completedFour:modes-(isFrozen?2:0),
  physicalArrivals:arrivals,physicalCompletedFour:full,
  cancelledAndNotArrived:lockCount,
  physicallyPendingOperators:0,unreachedDrainedOperators:unplanned,
  stallEpisodes:isHistory?3:isFresh?6:5,
  retries:isHistory?1:isFresh?12:17,
  exceptions:0,invalidPositions:0,corruptedPlans:0,
  physicsStepViolations:0,unboundedManeuverAttempts:0,
  arrivedDespiteCancellation:0
 };
 return {ticks:2700,rows,summary:s,
  corpus:isHistory?undefined:isFresh?'d3-18-eleventh-fresh22-20261115':
   'd3-15b4-tenth-blind22-20261115',
  routeQualitySummary:{searches:isHistory?2393:isFresh?4377:7680},
  progressSummary:{suspectedLoops:isFrozen?1:0,sustainedStill:0}
 };
}

test('A8 real historical 76/17/12 conservation beats impossible 80/81 floors',()=>{
 const report=corpus('historical11'),
  result=verifyA8PhysicalCohort(report,'historical11');
 assert.equal(result.ok,true,result.errors.join('; '));
 assert.equal(result.observed.arrivals,76);
 assert.equal(result.observed.fullSquads,17);
 assert.equal(result.observed.locked,12);
 assert.equal(result.observed.verifiedLocked,12);
 assert.equal(result.provenance.legacy.maxArrivalsWithSameLockedDoors,76);
 assert.equal(result.provenance.legacy.legacyFloorUnattainable,true);
 assert.equal(result.observed.pending,0);
});
test('A8 fresh corpus preserves 154 true arrivals, 35 full squads, 22 genuine locks',()=>{
 const report=corpus('fresh22'),
  result=verifyA8PhysicalCohort(report,'fresh22');
 assert.equal(result.ok,true,result.errors.join('; '));
 assert.equal(result.observed.arrivals,154);
 assert.equal(result.observed.fullSquads,35);
 assert.equal(result.observed.locked,22);
 assert.equal(result.provenance.legacy.maxArrivalsWithSameLockedDoors,154);
 assert.equal(result.provenance.legacy.legacyFloorUnattainable,true);
});
test('A8 frozen 146 real arrival, 31 full, 22 locks, 8 unplanned and 1 RECOVERED loop',()=>{
 const report=corpus('frozen22'),
  result=verifyA8PhysicalCohort(report,'frozen22');
 assert.equal(result.ok,true,result.errors.join('; '));
 assert.equal(result.observed.arrivals,146);
 assert.equal(result.observed.full,31);
 assert.equal(result.observed.pending,0);
 assert.equal(result.observed.unplanned,8);
 assert.equal(result.observed.locked,22);
 assert.equal(result.observed.loopIncidents,1);
 assert.equal(result.observed.recoveredLoops,1);
 assert.equal(frozenPolicy.minArrivals,146);
});
test('A8 refuses any fabricated arrived body, absent witness or invented locked leaf',()=>{
 for(const profile of ['historical11','fresh22']){
  for(const mutation of ['arrival-with-failed-order','no-witness',
    'unlocked-real-door','door-opened-while-locked',
    'wrong-failure','fake-summary']){
   const r=corpus(profile),mode=r.rows[0].modes[0],a=mode.operators[0];
   if(mutation==='arrival-with-failed-order')a.arrived=true;
   if(mutation==='no-witness')mode.d329CancelDoorWitness=[];
   if(mutation==='unlocked-real-door'){
    mode.d329CancelDoorWitness[0].actualSelectedDoor.locked=false;
    mode.d329CancelDoorWitness[0].lockedNearby=[];
   }
   if(mutation==='door-opened-while-locked')
    mode.d329CancelDoorWitness[0].actualSelectedDoor.open=true;
   if(mutation==='wrong-failure')a.lastFailedOrder.reason='ROUTE FAILED';
   if(mutation==='fake-summary')r.summary.physicalArrivals++;
   const result=verifyA8PhysicalCohort(r,profile);
   assert.equal(result.ok,false,profile+' '+mutation);
  }
 }
});
test('A8 rejects pending plans, newly cancelled bodies, loops and compromised 0.3u steps',()=>{
 for(const profile of ['historical11','fresh22','frozen22']){
  for(const mutation of ['new-pending','extra-locked',
    'physics-violation','extra-loop','route-search-explosion']){
   const r=corpus(profile);
   if(mutation==='new-pending'){
    const m=r.rows[0].modes[0],a=m.operators[0];
    a.arrived=false;a.failedOrders=0;a.outcome='pending';
    a.remainingOrders=1;m.arrivals--;r.summary.physicalArrivals--;
    r.summary.physicallyPendingOperators++;
   }
   if(mutation==='extra-locked'){
    const m=r.rows.at(-1).modes.at(-1),a=m.operators[0];
    a.arrived=false;a.failedOrders=1;a.outcome='cancelled';
    a.lastFailedOrder={id:900,at:9,reason:'PATH BLOCKED · DOOR LOCKED'};
    m.d329CancelDoorWitness.push({actor:a.id,
     failedOrder:{id:900,at:9},
     actualSelectedDoor:{id:'D7',locked:true,open:false}});
    m.arrivals--;r.summary.physicalArrivals--;
    r.summary.cancelledAndNotArrived++;
   }
   if(mutation==='physics-violation')r.summary.physicsStepViolations=1;
   if(mutation==='extra-loop')r.progressSummary.suspectedLoops=3;
   if(mutation==='route-search-explosion')
    r.routeQualitySummary.searches=99999;
   const result=verifyA8PhysicalCohort(r,profile);
   assert.equal(result.ok,false,profile+' '+mutation);
  }
 }
});
test('A8 frozen physically UNRECOVERED flagged loop is not a forgiven incident',()=>{
 const r=corpus('frozen22'),a=r.rows[0].modes[0].operators[0];
 assert.equal(a.arrived,true);
 a.arrived=false;a.outcome='pending';a.remainingOrders=1;
 r.rows[0].modes[0].arrivals--;
 r.summary.physicalArrivals--;
 r.summary.physicallyPendingOperators++;
 const result=verifyA8PhysicalCohort(r,'frozen22');
 assert.equal(result.ok,false);
 assert.match(result.errors.join('; '),
  /unrecovered physical movement loop|not physically recovered/);
});
