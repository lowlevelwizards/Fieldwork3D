import test from 'node:test';
import assert from 'node:assert/strict';
import {orientFurnishings,rotatedFootprint} from '../src/worldgen/prop-orientation.ts';
import {generateSite} from '../src/breach-site.ts';
test('cardinal rotation swaps physical rectangular footprint',()=>{
 assert.deepEqual(rotatedFootprint({x:0,y:0,w:60,h:25},1),{w:25,h:60});
});
test('chairs face real tables rather than shared global north',()=>{
 const room={id:'r',kind:'room',tone:0,x:0,y:0,w:220,h:220,purpose:'dining'};
 const table={x:110,y:110,w:60,h:35,fixture:'dining-table'};
 const chairs=[
  {x:110,y:55,w:30,h:24,fixture:'chair'},
  {x:110,y:166,w:30,h:24,fixture:'chair'},
  {x:43,y:110,w:30,h:24,fixture:'chair'},
  {x:177,y:110,w:30,h:24,fixture:'chair'},
 ];
 const site={rooms:[room],doors:[],openings:[]};
 const result=orientFurnishings(site,[table,...chairs]);
 assert.deepEqual(result.slice(1).map(x=>x.orientation),[0,2,1,3]);
 assert.deepEqual(result,orientFurnishings(site,[table,...chairs]));
});
test('random generated sites retain valid quarter-turns',()=>{
 for(const seed of [120,126,127,128,134]){
  const site=generateSite(seed);
  assert.ok(site.cover.every(c=>c.orientation===undefined||
   [0,1,2,3].includes(c.orientation)));
 }
});
