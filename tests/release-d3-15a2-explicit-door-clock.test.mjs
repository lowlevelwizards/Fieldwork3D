import test from 'node:test';
import assert from 'node:assert/strict';
import {preserveExplicitDoorActionClock}
 from '../src/breach-motor-door.ts';
import {mayHandoffOpenedDoorOrder}
 from '../src/breach-order-movement.ts';
import {leaderBeyondOpenEntry}
 from '../src/breach-entry-coordination.ts';

test('D3.15A2: full explicit DOOR clock survives motor footwork',()=>{
 for(const method of ['open','kick','close','hold'])
   assert.equal(preserveExplicitDoorActionClock({kind:'door',method}),true,
     'authored '+method+' timer is not a disposable implicit OPEN timer');
});

test('D3.15A2: transient movement and idle implicit timers still reset',()=>{
 for(const kind of ['move','pie','wait','sync','look'])
   assert.equal(preserveExplicitDoorActionClock({kind}),false);
 assert.equal(preserveExplicitDoorActionClock(undefined),false);
 assert.equal(preserveExplicitDoorActionClock(null),false);
});

test('D3.15A2: only reachable, already-open physical hinge yields DOOR execution',()=>{
 const door={id:'FRONT',kind:'hinged',a:{x:0,y:0},b:{x:40,y:0},
   hinge:'a',swing:1,open:true,openFraction:.94};
 const order={kind:'door',method:'open',doorId:'FRONT'};
 assert.equal(mayHandoffOpenedDoorOrder(order,{x:12,y:10},[door]),true);
 assert.equal(mayHandoffOpenedDoorOrder(order,{x:500,y:500},[door]),false,
   'no remote OPEN action from an unreachable operator');
 assert.equal(mayHandoffOpenedDoorOrder(order,{x:12,y:10},
   [{...door,open:false,openFraction:0}]),false);
 assert.equal(mayHandoffOpenedDoorOrder(order,{x:12,y:10},
   [{...door,openFraction:.08}]),false);
 for(const method of ['close','kick','hold'])
  assert.equal(mayHandoffOpenedDoorOrder({...order,method},{x:12,y:10},[door]),false);
 for(const kind of ['move','sync','wait'])
  assert.equal(mayHandoffOpenedDoorOrder({...order,kind},{x:12,y:10},[door]),false);
 assert.equal(mayHandoffOpenedDoorOrder({...order,doorId:'D2'},
   {x:12,y:10},[door]),false);
});

test('D3.15A3: real lead far-side evidence releases attempt only, not physics',()=>{
 const door={id:'FRONT',kind:'hinged',a:{x:0,y:0},b:{x:50,y:0},
   hinge:'a',swing:1,open:true,openFraction:1.12};
 const lead={x:25,y:30},wait={x:25,y:-21},goal={x:30,y:50};
 assert.equal(leaderBeyondOpenEntry(door,lead,wait,goal),true);
 assert.equal(leaderBeyondOpenEntry({...door,open:false},lead,wait,goal),false);
 assert.equal(leaderBeyondOpenEntry({...door,openFraction:.45},lead,wait,goal),false);
 assert.equal(leaderBeyondOpenEntry({...door,locked:true},lead,wait,goal),false);
 assert.equal(leaderBeyondOpenEntry({...door,wedged:true},lead,wait,goal),false);
 assert.equal(leaderBeyondOpenEntry({...door,heldBy:'enemy'},lead,wait,goal),false);
 assert.equal(leaderBeyondOpenEntry(door,{x:25,y:-20},wait,goal),false,
   'same side of panel is not verified lead entry');
 assert.equal(leaderBeyondOpenEntry(door,{x:25,y:9},wait,goal),false,
   'leader must clear the plane with full body');
 assert.equal(leaderBeyondOpenEntry(door,lead,{x:25,y:30},goal),false,
   'follower already inside does not need a false alternative gate');
 assert.equal(leaderBeyondOpenEntry(door,lead,wait,{x:30,y:-50}),false,
   'cannot release toward a destination on the near side');
 assert.equal(leaderBeyondOpenEntry(door,lead,wait,undefined),false);
});
