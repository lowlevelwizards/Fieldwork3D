import test from 'node:test';
import assert from 'node:assert/strict';
import {fixtureFacing,footprintAtFacing,workingClearance}
 from '../src/worldgen/fixture-facing.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {generateSite} from '../src/breach-site.ts';
test('fixtures face inward, while seating looks toward the actual table',()=>{
 const room={id:'r',x:0,y:0,w:220,h:175,kind:'room',purpose:'dining'};
 assert.equal(fixtureFacing(room,'counter',{x:60,y:17}),0);
 assert.equal(fixtureFacing(room,'counter',{x:190,y:80}),3);
 const table={fixture:'dining-table',x:110,y:80,w:34,h:26};
 assert.equal(fixtureFacing(room,'chair',{x:110,y:120},[table]),2);
 assert.equal(fixtureFacing(room,'chair',{x:155,y:80},[table]),3);
 assert.deepEqual(footprintAtFacing(63,29,1),{w:29,h:63});
 assert.equal(workingClearance(room,{x:110,y:12,w:30,h:22,fixture:'sink',facing:0},[]),true);
 assert.equal(workingClearance(room,{x:110,y:163,w:30,h:22,fixture:'sink',facing:0},[]),false);
});
test('live generated oriented fixtures have rotated collision footprints',()=>{
 let oriented=0;
 for(let seed=1;seed<=18;seed++){
  const a=generateSite(seed),b=generateSite(seed);
  assert.deepEqual(a.cover,b.cover);
  for(const o of a.cover){
   if(o.facing===undefined)continue;
   const asset=propDefinition(o.fixture??'');
   assert.ok(asset,'unknown oriented fixture');
   assert.deepEqual({w:o.w,h:o.h},
     footprintAtFacing(asset.width,asset.depth,o.facing));
   oriented++;
  }
 }
 assert.ok(oriented>15);
});
