import test from 'node:test';
import assert from 'node:assert/strict';
import {traceD317RouteOwnership} from '../scripts/lib/d3-17b-route-timeline.mjs';
const e=(seconds,source,actorId='ash')=>({
 seconds,source,actorId,prior:[{x:1,y:2}],next:[{x:3,y:4}],
 position:{x:10,y:20},doorId:'FRONT',doorPhase:'approach',
 doorManeuver:'direct',blockedTime:0
});
test('D3.17B: retain real event order and count A-B-A source ownership reversions',()=>{
 const events=[e(1,'initial-intel'),e(2,'door-rehearsal'),
  e(3,'initial-intel'),e(4,'door-rehearsal'),e(5,'initial-intel')];
 const source={routeTransitions:{events}};
 const before=JSON.stringify(source),r=traceD317RouteOwnership(source,'ash');
 assert.equal(JSON.stringify(source),before,'never mutate source evidence');
 assert.equal(r.totalEvents,5);
 assert.equal(r.sources['initial-intel'],3);
 assert.equal(r.sources['door-rehearsal'],2);
 assert.equal(r.switches['initial-intel -> door-rehearsal'],2);
 assert.equal(r.switches['door-rehearsal -> initial-intel'],2);
 assert.equal(r.reversions['initial-intel -> door-rehearsal -> initial-intel'],2);
 assert.equal(r.reversions['door-rehearsal -> initial-intel -> door-rehearsal'],1);
 assert.deepEqual(r.fullEvents[0].prior,[{x:1,y:2}]);
});
test('D3.17B: never mix different operators or pretend route counts prove a cause',()=>{
 const r=traceD317RouteOwnership({routeTransitions:{events:[
  e(1,'full-body-lane','rook'),e(2,'initial-intel','ash'),
  e(3,'blocked-leg-connector','rook')
 ]}},'rook');
 assert.equal(r.totalEvents,2);
 assert.equal(r.sources['initial-intel'],undefined);
 assert.equal(r.switches['full-body-lane -> blocked-leg-connector'],1);
});
test('D3.17B: empty route witness stays explicit',()=>{
 const r=traceD317RouteOwnership({},'ash');
 assert.equal(r.totalEvents,0);
 assert.deepEqual(r.fullEvents,[]);
});
