import test from 'node:test';
import assert from 'node:assert/strict';
import {friendlyPassingStep,nearOccupiedFriendlyGoal}
 from '../src/breach-friendly-traffic.ts';
const near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('no friend: preserve exact desired movement',()=>{
 const from={x:0,y:0},to={x:2,y:0};
 assert.deepEqual(friendlyPassingStep(from,to,{x:30,y:0},[],()=>true),to);
});
test('near friend: only the mover alters course, with same step length',()=>{
 const from={x:0,y:0},to={x:2,y:0},goal={x:30,y:0};
 const teammate={x:12,y:0},original={...teammate};
 const next=friendlyPassingStep(from,to,goal,[teammate],()=>true);
 assert.ok(near(next,teammate)>=near(to,teammate));
 assert.ok(near(next,from)<=2.00001);
 assert.deepEqual(teammate,original);
});
test('no available alternate step: movement never deadlocks against friendly',()=>{
 const from={x:0,y:0},to={x:2,y:0},goal={x:30,y:0};
 assert.deepEqual(friendlyPassingStep(from,to,goal,[{x:12,y:0}],
   ()=>false),to);
});
test('occupied goal may be settled next to, not directly atop, another operator',()=>{
 const goal={x:20,y:20},peer={x:20,y:20},actor={x:4,y:20};
 assert.equal(nearOccupiedFriendlyGoal(actor,goal,[peer],()=>true),true);
 assert.equal(nearOccupiedFriendlyGoal(goal,goal,[peer],()=>true),false);
 assert.equal(nearOccupiedFriendlyGoal(actor,goal,[peer],()=>false),false);
});
