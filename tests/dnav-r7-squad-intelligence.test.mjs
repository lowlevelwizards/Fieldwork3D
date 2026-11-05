import test from 'node:test';
import assert from 'node:assert/strict';
import {passageWait} from '../src/breach-passage.ts';
import {friendlyPassingStep} from '../src/breach-friendly-traffic.ts';
const door={id:'SQUAD',a:{x:40,y:100},b:{x:98,y:100},open:true};
const actor=(id,x,y)=>({id,side:'blue',p:{x,y},
 goal:{x,y:180},health:4,blockedTime:0,active:true});
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('R7a: a single-file follower remains queued on the same lateral lane',()=>{
 const lead=actor('lead',68,107),follow=actor('follow',50,92),leases={};
 assert.equal(passageWait(follow,[door],[lead,follow],leases,1,
  {x:50,y:95}),true);
});
test('R7a: a physically separated diagonal lane exit can advance',()=>{
 const lead=actor('lead',68,107),follow=actor('follow',50,92),leases={};
 assert.equal(passageWait(follow,[door],[lead,follow],leases,1,
  {x:48,y:95}),false,'two full-body lanes should flow independently');
 assert.deepEqual(follow.p,{x:50,y:92},'a queue decision never moves a teammate');
 assert.deepEqual(follow.goal,{x:50,y:180},'no authored route mutation');
});
test('R7b: avoid a teammate a few ticks before body contact',()=>{
 const from={x:0,y:0},desired={x:2,y:0},goal={x:40,y:0};
 const friend={x:21,y:0};
 const move=friendlyPassingStep(from,desired,goal,[friend],()=>true);
 assert.ok(gap(move,friend)>gap(desired,friend)+.01,
  'physical separation should start before near overlap');
 assert.ok(gap(from,move)<=2.001);
 assert.ok(gap(from,goal)-gap(move,goal)>=.8,
  'cosmetic yield cannot replace forward travel with a sideways shuffle');
});
test('R7b: impossible yield does not deadlock movement or push a friendly',()=>{
 const from={x:0,y:0},desired={x:2,y:0},goal={x:40,y:0};
 const friend={x:21,y:0},original={...friend};
 assert.deepEqual(friendlyPassingStep(from,desired,goal,[friend],
  ()=>false),desired);
 assert.deepEqual(friend,original);
});
