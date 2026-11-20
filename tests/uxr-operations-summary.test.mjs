import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOperationsSummary} from '../src/ui/campaign/operations-summary.ts';

const member=(id,recoveryDays=0,status='available')=>({id,recoveryDays,status});
const offer=(id,deadline,status='available')=>({id,deadline,status});
const fixture=()=>({
 day:4,operators:[member('rook'),member('lin'),member('ash',2),member('reserve')],
 squadIds:['rook','lin','ash','missing'],
 supplies:{ammo:22,medical:0},
 contracts:[offer('later',8),offer('soon',5),offer('closed',4,'completed')]
});

test('UXR-02: urgency and attention come from authoritative snapshot',()=>{
 const snapshot=projectOperationsSummary(fixture());
 assert.deepEqual(snapshot.cases.map(c=>c.id),['soon','later']);
 assert.equal(snapshot.leadCase?.id,'soon');
 assert.equal(snapshot.assigned,3);
 assert.equal(snapshot.ready,2);
 assert.equal(snapshot.freeReady,3);
 assert.deepEqual(snapshot.attention.map(x=>x.id),['squad','recovery','ammo','medical']);
 assert.deepEqual(snapshot.attention.map(x=>x.destination),[
  'personnel','personnel','logistics','logistics']);
});
test('UXR-02: projection does not mutate a campaign snapshot',()=>{
 const state=fixture();
 const original=JSON.stringify(state);
 projectOperationsSummary(state);
 assert.equal(JSON.stringify(state),original);
});
test('UXR-02: no spurious alerts when squad and stock are ready',()=>{
 const state=fixture();
 state.operators=[member('rook'),member('lin'),member('ash'),member('reserve')];
 state.squadIds=['rook','lin','ash','reserve'];
 state.supplies={ammo:240,medical:3};
 assert.equal(projectOperationsSummary(state).attention.length,0);
});
