import test from 'node:test';
import assert from 'node:assert/strict';
import {claimD326ColdFineProbe,markD326FineMotorRoute,
 ownsD326FineMotorRoute}
 from '../src/breach-d326-fine-route-gate.ts';

const goal={x:220,y:105};
const create=()=>({
 side:'blue',p:{x:50,y:100},plan:[{id:7,kind:'move',p:goal}],
 squeeze:false,traversal:null,traversalPending:null,fireRetreatTarget:null
});
test('D3.26F cold probe never retries each frame and has fixed attempt budget',()=>{
 const actor=create();
 assert.equal(claimD326ColdFineProbe(actor,goal,6),true);
 assert.equal(claimD326ColdFineProbe(actor,goal,6.02),false);
 assert.equal(claimD326ColdFineProbe(actor,goal,9.9),false);
 assert.equal(claimD326ColdFineProbe(actor,goal,10.1),true);
 assert.equal(claimD326ColdFineProbe(actor,goal,15),false,
  'same physical anchor cannot consume infinite fine A*');
 actor.p={x:74,y:100};
 assert.equal(claimD326ColdFineProbe(actor,goal,15),true);
 assert.equal(claimD326ColdFineProbe(actor,goal,50),false,
  'max three for unchanged MOVE, even after travel');
});
test('D3.26F generated entry, stack, squeeze and non-MOVE never own fine route',()=>{
 for(const variation of [
  {plan:[{id:7,kind:'wait',p:goal}]},
  {plan:[{id:7,kind:'move',p:goal,entryDoorId:'D1'}]},
  {plan:[{id:7,kind:'move',p:goal,stackDoorId:'D1'}]},
  {squeeze:true},{traversal:{id:'window'}},
  {traversalPending:{id:'window'}},{fireRetreatTarget:{x:150,y:150}},
  {side:'red'},{p:{x:219,y:105}}
 ]){
  const actor={...create(),...variation};
  assert.equal(claimD326ColdFineProbe(actor,goal,10),false);
 }
});
test('D3.26F changed authored GO/order starts a new bounded entitlement',()=>{
 const actor=create();
 assert.equal(claimD326ColdFineProbe(actor,goal,1),true);
 const other={x:250,y:105};
 actor.plan=[{id:8,kind:'move',p:other}];
 assert.equal(claimD326ColdFineProbe(actor,other,1.01),true);
});

test('D3.26F5 fine route survives waypoint shifts but not route replacement',()=>{
 const a={...create(),nav:[{x:48,y:96},{x:46,y:92},goal]};
 assert.equal(ownsD326FineMotorRoute(a),false);
 markD326FineMotorRoute(a);
 assert.equal(ownsD326FineMotorRoute(a),true);
 a.nav.shift();
 assert.equal(ownsD326FineMotorRoute(a),true,
  'coarse lookahead must stay disabled across true fine waypoint advances');
 a.nav=[{x:52,y:94},goal];
 assert.equal(ownsD326FineMotorRoute(a),false,
  'replacement route returns to normal optimization');
 markD326FineMotorRoute(a);
 a.nav.length=0;
 assert.equal(ownsD326FineMotorRoute(a),false);
});
