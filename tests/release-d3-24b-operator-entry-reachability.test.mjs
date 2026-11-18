import test from 'node:test';
import assert from 'node:assert/strict';
import {entryLanes,sharedEntryRouteOrigin} from '../src/breach-entry-lanes.ts';
import {settleKnownEntryLandings} from '../src/breach-entry-landing.ts';

const door={id:'D1',a:{x:100,y:100},b:{x:140,y:100},
 open:false,openFraction:0,swing:1,hinge:'a'};
const from={x:120,y:50};
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

test('D3.24B generator checks actual operator index for every assigned lane',()=>{
 const perOperator=(index,p)=>index%2===0?p.x>=125:p.x<=115;
 const lanes=entryLanes(door,from,4,()=>true,perOperator);
 assert.equal(lanes.length,4);
 for(let i=0;i<lanes.length;i++){
  assert.ok(perOperator(i,lanes[i].point),
    'slot '+i+' must be reachable by its assigned operator');
  assert.ok(lanes[i].point.y>100,'all assigned clear sectors stay interior');
  for(let j=0;j<i;j++)
   assert.ok(dist(lanes[i].point,lanes[j].point)>=23);
 }
});

test('D3.24B generated landing correction checks reachability by assigned index',()=>{
 const lanes=entryLanes(door,from,4,()=>true);
 assert.equal(lanes.length,4);
 const original=lanes.map(s=>({...s.point}));
 const corrected=settleKnownEntryLandings(door,lanes,
  (p,index)=>index!==0||p.x>=original[0].x+2);
 assert.ok(corrected,'a legal bounded correction should exist');
 assert.ok(corrected[0].point.x>=original[0].x+2,
  'the first operator must never borrow reachability of another');
 for(let i=0;i<corrected.length;i++){
  assert.ok(corrected[i].point.y>100);
  for(let j=0;j<i;j++)
   assert.ok(dist(corrected[i].point,corrected[j].point)>=23);
 }
});

test('D3.24B rejects a squad if no assigned landing is reachable',()=>{
 const lanes=entryLanes(door,from,4,()=>true,(index,p)=>
  index!==2||false);
 assert.deepEqual(lanes,[],'do not silently substitute lead route');
});

test('D3.24B2 share only a genuinely swept, known full-body origin',()=>{
 const lead={x:120,y:100},near={x:140,y:100},far={x:200,y:100};
 assert.equal(sharedEntryRouteOrigin(near,lead,()=>true),true,
  'short clear route can reuse lead origin');
 assert.equal(sharedEntryRouteOrigin(far,lead,()=>true),false,
  'distant teammates require their own route');
 const wall=p=>!(p.x>=128&&p.x<=132);
 assert.equal(sharedEntryRouteOrigin(near,lead,wall),false,
  'wall-separated teammates must not borrow a leader route');
 assert.equal(sharedEntryRouteOrigin(near,lead,()=>false),false,
  'unknown or physically narrow connector cannot claim reachability');
});
