import test from 'node:test';
import assert from 'node:assert/strict';
import {
 recordRejectedMovementCommit,clearUnrejectedCommit,pendingCommitStall
} from '../src/breach-movement-commit-progress.ts';

const actor=(id=11)=>({
 blockedTime:0,lastBlocker:'clear',plan:[{id,kind:'move'}]
});
const step=1/60;
test('R1.03: authoritative frame rejection accumulates across provisional motor resets',()=>{
 const a=actor();
 let at=0;
 for(let i=1;i<=120;i++){
  a.blockedTime=0; a.lastBlocker='clear'; // provisional motor accepted
  at+=step;
  const total=recordRejectedMovementCommit(a,'actor',at,step);
  clearUnrejectedCommit(a,at);
  assert.ok(Math.abs(total-i*step)<1e-6,
   'only actual authority denial should accumulate');
  assert.equal(a.lastBlocker,'actor');
 }
 assert.ok(Math.abs(a.blockedTime-2)<1e-6,
  'the authoritative 120th 60Hz denial reaches the two-second recovery gate');
});
test('R1.03: a committed or paused frame clears an old denial episode',()=>{
 const a=actor();
 recordRejectedMovementCommit(a,'actor',step,step);
 assert.ok(pendingCommitStall(a)>0);
 clearUnrejectedCommit(a,2*step);
 assert.equal(pendingCommitStall(a),0);
 a.blockedTime=0;
 assert.equal(recordRejectedMovementCommit(a,'actor',3*step,step),step,
   'stale blocked time must not leak across an intervening accepted frame');
});
test('R1.03: a different authored order cannot inherit prior frame blockage',()=>{
 const a=actor(1);
 recordRejectedMovementCommit(a,'actor',step,step);
 a.plan=[{id:2,kind:'move'}];a.blockedTime=0;
 assert.equal(recordRejectedMovementCommit(a,'geometry',2*step,step),step);
 assert.equal(a.lastBlocker,'route');
});
test('R1.03: no active physical order never accumulates artificial block time',()=>{
 const a=actor(1);
 a.plan=[];
 assert.equal(recordRejectedMovementCommit(a,'actor',step,step),0);
 assert.equal(pendingCommitStall(a),0);
});

test('R1.03: motor and frame arbiter observing one blocked frame never double count it',()=>{
 const a=actor(),dt=1/60;
 a.blockedTime=dt; // local motor already saw real geometry rejection
 assert.equal(recordRejectedMovementCommit(a,'geometry',dt,dt),dt);
 a.blockedTime=2*dt; // the second local motor rejection also counted dt
 assert.equal(recordRejectedMovementCommit(a,'geometry',2*dt,dt),2*dt,
  'two actual ticks must equal two, not four, blocked intervals');
});
test('R1.03: stale blockedTime cannot carry into a new authored MOVE',()=>{
 const a=actor(1),dt=1/60;
 a.blockedTime=3;
 recordRejectedMovementCommit(a,'actor',dt,dt);
 a.plan=[{id:2,kind:'move'}];
 a.blockedTime=4;
 assert.equal(recordRejectedMovementCommit(a,'actor',2*dt,dt),dt);
});
