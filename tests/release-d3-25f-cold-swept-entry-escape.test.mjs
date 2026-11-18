import test from 'node:test';
import assert from 'node:assert/strict';
import {coldSweptEntryEscapeJoin} from '../src/breach-d325-escape-join.ts';
const prior={x:254.38,y:101.78},at={x:253.03,y:101.78};
const goal={x:354,y:105.27};
const route=from=>[{x:240,y:104},goal];
test('D3.25F accepts only verified first leg following actual leaf escape',()=>{
 const path=coldSweptEntryEscapeJoin(prior,at,goal,
  ()=>true,
  (from,to)=>to.x<=250.05||from.x<=250.05,
  route);
 assert.equal(path.length,3);
 assert.ok(Math.abs(path[0].x-250.03)<.01);
 assert.deepEqual(path.at(-1),goal,'never changes the real ENTRY goal');
});
test('D3.25F no movement after too-long, missing or unswept escape',()=>{
 const valid=()=>true,sweep=()=>true;
 assert.deepEqual(coldSweptEntryEscapeJoin(at,at,goal,valid,sweep,route),[]);
 assert.deepEqual(coldSweptEntryEscapeJoin({x:265,y:100},at,goal,valid,sweep,route),[]);
 assert.deepEqual(coldSweptEntryEscapeJoin(prior,at,goal,
  ()=>false,sweep,route),[]);
 assert.deepEqual(coldSweptEntryEscapeJoin(prior,at,goal,
  valid,()=>false,route),[]);
});
test('D3.25F cannot replace authored destination with portal-only prefix',()=>{
 assert.deepEqual(coldSweptEntryEscapeJoin(prior,at,goal,
  ()=>true,()=>true,()=>[{x:245,y:100}]),[]);
});
