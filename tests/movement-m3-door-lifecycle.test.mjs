import test from 'node:test';
import assert from 'node:assert/strict';
import {syncDoorTraversalEpisode} from '../src/breach-door-traversal-episode.ts';
import {openingLeasePhysicallyExpired}
 from '../src/breach-door-opening-ownership.ts';
const p=(x,y)=>({x,y});
const door={id:'FRONT',kind:'hinged',a:p(80,100),b:p(120,100),
 open:true,openFraction:1.15,angularVelocity:0};
const actor=(position=p(100,260))=>({id:'rook',p:position,health:4,
 side:'blue',surrendered:false,blockedTime:0,
 doorTraversalLastProbeAt:-100,
 plan:[{kind:'move',id:19,p:p(100,40),entryDoorId:'FRONT'}],
 doorHandContact:null,doorTraversal:null});
const episode=(position)=>({doorId:'FRONT',authoredOrderId:19,
 destination:p(100,40),approachSide:1,startedAt:0,
 phase:'clear-leaf',maneuver:'outside-leaf',lastProgressAt:0,
 lastPosition:position,lastTransitionAt:0,obstructionReason:null,
 waypoints:[],waypointIndex:0,handContact:false,
 maneuverAttempts:1,nextManeuverAt:0,selectedLeafFraction:1.15,
 driftRecoveries:0});
test('M3.1 finished remote leaf bypass releases obsolete episode',()=>{
 const a=actor();a.doorTraversal=episode(a.p);
 assert.equal(syncDoorTraversalEpisode(a,[door],10),null);
 assert.equal(a.doorTraversal,null);
 assert.equal(a.plan[0].id,19,'authored GO retained');
});
test('M3.1 active leaf waypoint and attached hand retain genuine ownership',()=>{
 const moving=actor();moving.doorTraversal=episode(moving.p);
 moving.doorTraversal.waypoints=[p(100,245)];
 assert.ok(syncDoorTraversalEpisode(moving,[door],10));
 assert.equal(moving.doorTraversal.maneuver,'outside-leaf');
 const held=actor();held.doorTraversal=episode(held.p);
 held.doorHandContact={doorId:'FRONT',releasedAt:null};
 assert.ok(syncDoorTraversalEpisode(held,[door],10));
});
test('M3.1 changed authored occurrence retires stale episode',()=>{
 const a=actor();a.doorTraversal=episode(a.p);
 a.plan=[{kind:'move',id:20,p:p(100,40)}];
 assert.equal(syncDoorTraversalEpisode(a,[door],10),null);
 assert.equal(a.doorTraversal,null);
});
test('M3.2 stagnated door manipulator yields; genuine progress/hand does not',()=>{
 assert.equal(openingLeasePhysicallyExpired(3.19,0,false),false);
 assert.equal(openingLeasePhysicallyExpired(3.2,0,false),true);
 assert.equal(openingLeasePhysicallyExpired(30,0,true),false);
 assert.equal(openingLeasePhysicallyExpired(4,2,false),false);
});

test('M3.6 genuinely stalled remote detour does not own old hinge forever',()=>{
 const a=actor();a.doorTraversal=episode(a.p);
 a.doorTraversal.waypoints=[p(100,245)];
 a.doorTraversal.lastProgressAt=0;
 assert.equal(syncDoorTraversalEpisode(a,[door],4.01),null);
 assert.equal(a.doorTraversal,null);
 assert.equal(a.plan[0].id,19);
});
test('M3.6 remotely abandoned CLOSED approach retires; near real approach stays',()=>{
 const shut={...door,open:false,openFraction:0};
 const far=actor();far.doorTraversal=episode(far.p);
 far.doorTraversal.phase='approach';far.doorTraversal.maneuver='direct';
 assert.equal(syncDoorTraversalEpisode(far,[shut],4),null);
 const near=actor(p(100,124));near.doorTraversal=episode(near.p);
 near.doorTraversal.phase='approach';near.doorTraversal.maneuver='direct';
 assert.ok(syncDoorTraversalEpisode(near,[shut],4));
});
