import test from 'node:test';import assert from 'node:assert/strict';
import {orientFurnishings} from '../src/worldgen/prop-orientation.ts';
test('waiting seats face a separate reception desk',()=>{
 const rooms=[
  {id:'waiting',kind:'room',purpose:'waiting',tone:0,x:0,y:0,w:160,h:140},
  {id:'reception',kind:'room',purpose:'reception',tone:0,x:160,y:0,w:170,h:140}];
 const site={rooms,doors:[],openings:[]};
 const furniture=[
  {x:50,y:64,w:28,h:24,fixture:'chair'},
  {x:246,y:64,w:36,h:24,fixture:'desk'},
 ];
 const result=orientFurnishings(site,furniture);
 assert.equal(result[0].orientation,1,'chair faces toward reception');
});
test('front-use clearance prevents chairs from pointing into a wall',()=>{
 const site={rooms:[{id:'r',kind:'room',purpose:'waiting',tone:0,x:0,y:0,w:110,h:100}],
 doors:[],openings:[]};
 const result=orientFurnishings(site,[{x:45,y:24,w:30,h:24,fixture:'chair'}]);
 assert.notEqual(result[0].orientation,2,'chair cannot face through north boundary');
 assert.deepEqual(result,orientFurnishings(site,[{x:45,y:24,w:30,h:24,fixture:'chair'}]));
});
