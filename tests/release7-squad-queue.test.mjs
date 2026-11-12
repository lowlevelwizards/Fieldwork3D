import test from 'node:test';
import assert from 'node:assert/strict';
import {passageDeadlockRetreatTarget} from '../src/breach-passage.ts';
const p=(x,y)=>({x,y});
const door={id:'ENTRY',a:p(90,100),b:p(126,100),open:true,
 openedAt:0,openFraction:1,kind:'hinged'};
const actor=(id,y,goalY)=>({id,p:p(108,y),goal:p(108,goalY),
 active:true,health:100,blockedTime:1.3,waitSeconds:2.8,side:'blue'});

test('R7.2 convoy wait: same-direction followers never reverse behind queue',()=>{
 const lead=actor('LEAD',92,140),follower=actor('FOLLOW',80,140);
 assert.equal(passageDeadlockRetreatTarget(follower,[door],
  [lead,follower],()=>true),null,
  'a delayed follower must not continually add retreat waypoints');
 assert.equal(passageDeadlockRetreatTarget(lead,[door],
  [lead,follower],()=>true),null);
});

test('R7.2 real counterflow: only the loser receives a cleared retreat',()=>{
 const a=actor('A',90,140),b=actor('B',110,70);
 assert.equal(passageDeadlockRetreatTarget(a,[door],[a,b],()=>true),null);
 const target=passageDeadlockRetreatTarget(b,[door],[a,b],()=>true);
 assert.ok(target&&target.y>b.p.y,
  'opposing claimant backs away from destination to clear the mouth');
 assert.equal(passageDeadlockRetreatTarget(b,[door],[a,b],()=>false),
  null,'swept physical clearance vetoes even legitimate retreat');
});
