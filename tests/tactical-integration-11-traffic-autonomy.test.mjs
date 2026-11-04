import test from 'node:test';
import assert from 'node:assert/strict';
import {passageWait} from '../src/breach-passage.ts';
import {friendlyPassingStep} from '../src/breach-friendly-traffic.ts';

const doorway={id:'THRESHOLD',a:{x:40,y:100},b:{x:88,y:100},open:true};
const actor=(id,x,y,goalX=x,goalY=180)=>({
 id,side:'blue',p:{x,y},goal:{x:goalX,y:goalY},
 health:4,blockedTime:0,active:true
});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('manually authored lateral/reverse segments escape a crowded doorway queue',()=>{
 const lead=actor('lead',64,108),follower=actor('follower',64,93);
 const members=[follower,lead],leases={};
 assert.equal(passageWait(follower,[doorway],members,leases,1,{x:64,y:95}),true);
 assert.equal(passageWait(follower,[doorway],members,leases,1.1,{x:66,y:93}),false,
  'lateral movement does not close the gap with the preceding soldier');
 assert.equal(passageWait(follower,[doorway],members,leases,1.2,{x:64,y:91}),false,
  'an explicit retreat must be allowed even inside a narrow entry');
 assert.deepEqual(follower.goal,{x:64,y:180},'queue must not alter plan intent');
 assert.deepEqual(lead.p,{x:64,y:108},'teammates must not be displaced');
});

test('two distinct physically spaced lanes are not serialized into one convoy',()=>{
 const left=actor('left',51,94,51,180),right=actor('right',77,87,77,180);
 const members=[left,right],leases={};
 assert.equal(passageWait(left,[doorway],members,leases,1,{x:51,y:95}),false);
 assert.equal(passageWait(right,[doorway],members,leases,1,{x:77,y:89}),false);
 assert.deepEqual(members.map(a=>a.p),[{x:51,y:94},{x:77,y:87}]);
});

test('cosmetic friendly avoidance keeps player-authored forward progress',()=>{
 const from={x:0,y:0},desired={x:2,y:0},goal={x:40,y:0};
 const peer={x:11,y:0},original=structuredClone(peer);
 const next=friendlyPassingStep(from,desired,goal,[peer],()=>true);
 assert.ok(dist(from,goal)-dist(next,goal)>=.80,
  'avoidance must not replace forward movement with sideways drift');
 assert.ok(dist(from,next)<=2.00001);
 assert.deepEqual(peer,original);
 assert.deepEqual(goal,{x:40,y:0});
});

test('an intentionally waiting operator does not gain a phantom reservation',()=>{
 const waiting={...actor('wait',64,101),goal:null,active:false};
 const moving=actor('go',64,86),leases={};
 assert.equal(passageWait(moving,[doorway],[waiting,moving],leases,2,
  {x:64,y:88}),false);
 assert.equal(leases['blue:THRESHOLD'].actorId,'go');
});
