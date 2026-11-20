import test from 'node:test';
import assert from 'node:assert/strict';
import {claimM2EntrySqueezeProbe,selectM2EntrySqueezeDeparture}
 from '../src/breach-m2-entry-squeeze-departure.ts';
const p=(x,y)=>({x,y});
const actor=()=>({side:'blue',p:p(0,0),plan:[{id:1,kind:'move',
 entryDoorId:'FRONT',p:p(100,0)}],squeeze:true,blockedTime:2,
 lastBlocker:'wall',traversal:null,traversalPending:null,
 doorTraversal:null,fireRetreatTarget:null});
test('M2.8: no repeated cold probing at one blocked anchor',()=>{
 const a=actor();assert.equal(claimM2EntrySqueezeProbe(a,p(100,0),5),true);
 assert.equal(claimM2EntrySqueezeProbe(a,p(100,0),5.5),false);
 assert.equal(claimM2EntrySqueezeProbe(a,p(100,0),10),true,
  'one delayed retry is legal even if the first probe produced no route');
 assert.equal(claimM2EntrySqueezeProbe(a,p(100,0),15),false);
 a.p=p(5,0);assert.equal(claimM2EntrySqueezeProbe(a,p(100,0),20),true);
 assert.equal(claimM2EntrySqueezeProbe(a,p(100,0),25),false);
 a.plan=[{id:2,kind:'move',p:p(100,0)}];
 assert.equal(claimM2EntrySqueezeProbe(a,p(100,0),25),false);
});
test('M2.8: cold departure requires complete real full-body first leg',()=>{
 const world=(from,to)=>[to];
 const blocked=()=>false;
 assert.deepEqual(selectM2EntrySqueezeDeparture(p(0,0),p(30,0),p(-4,0),
  blocked,()=>true,world),[]);
});
test('M2.8: accepts only swept departure and narrow rejoin without moving actor',()=>{
 const from=p(0,0),goal=p(30,0);
 const full=(a,b)=>b.x<a.x&&Math.abs(b.y)<1;
 const narrow=()=>true;
 const proposed=selectM2EntrySqueezeDeparture(from,goal,p(-4,0),
  full,narrow,(_a,to)=>[to]);
 assert.ok(proposed.length>=2);
 assert.ok(proposed[0].x<0);
 assert.deepEqual(proposed.at(-1),goal);
 assert.deepEqual(from,p(0,0));
 assert.deepEqual(selectM2EntrySqueezeDeparture(from,goal,p(-4,0),
  full,()=>false,(_a,to)=>[to]),[]);
 const squeezeOnly=selectM2EntrySqueezeDeparture(from,goal,p(-4,0),
  ()=>false,narrow,(_a,to)=>[to]);
 assert.ok(squeezeOnly.length>=2,
  'already-squeezing actor may use the real exact narrow-profile footstep');
});
