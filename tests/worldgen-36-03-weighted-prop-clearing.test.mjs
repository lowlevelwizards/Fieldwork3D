import test from 'node:test';
import assert from 'node:assert/strict';
import {coverMass,coverPushDistance,canRelocateCover,relocateCover}
 from '../src/breach-movable-cover.ts';
const box=(fixture,x,y,w=18,h=18)=>({fixture,x,y,w,h,low:true});
test('weight limits and clearable loose clutter share the existing push command',()=>{
 for(const id of ['storage-tote','tipped-trash-bin','trash-bag','mop-bucket']){
  const o=box(id,45,45);
  assert.equal(coverMass(o),'light');assert.equal(coverPushDistance(o),18);
  assert.equal(canRelocateCover(o),true);
 }
 assert.equal(coverPushDistance(box('crate',45,45)),11);
 assert.equal(coverPushDistance(box('armchair',45,45)),6);
 assert.equal(canRelocateCover(box('vehicle-lift',45,45)),false);
 assert.equal(canRelocateCover({...box('storage-tote',45,45),destroyed:true}),false);
});
test('pushes use a swept path and do not tunnel through other physical props',()=>{
 const cover=[box('storage-tote',30,40,10,10),box('crate',44,40,5,5)];
 assert.equal(relocateCover(cover,0,{x:48,y:40},[],[],[]),false);
 assert.deepEqual([cover[0].x,cover[0].y],[30,40]);
 assert.equal(relocateCover(cover,0,{x:30,y:57},[],[],[]),true);
 assert.deepEqual([cover[0].x,cover[0].y],[30,57]);
});
test('walls, doors, actors, and overlarge moves prevent displacement',()=>{
 const cover=[box('storage-tote',35,45,10,10)];
 const wall={a:{x:45,y:18},b:{x:45,y:82}};
 assert.equal(relocateCover(cover,0,{x:52,y:45},[wall],[],[]),false);
 const door={id:'D',a:{x:45,y:20},b:{x:45,y:75},open:false};
 assert.equal(relocateCover(cover,0,{x:51,y:45},[],[door],[]),false);
 assert.equal(relocateCover(cover,0,{x:52,y:45},[],[],[{x:48,y:45}]),false);
 assert.equal(relocateCover(cover,0,{x:54,y:45},[],[],[]),false);
 assert.equal(relocateCover(cover,0,{x:35,y:57},[],[],[]),true);
});
