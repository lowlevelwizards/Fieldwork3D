import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planObjectWear} from '../src/worldgen/object-wear.ts';
test('all object wear anchors refer to real game components',()=>{
 for(let i=1;i<=50;i++){
  const site=generateSite(i),marks=planObjectWear(site);
  assert.deepEqual(marks,planObjectWear(site));
  assert.ok(marks.length<=14);
  for(const m of marks){
   const size=m.owner==='door'?site.doors.length:m.owner==='wall'?site.walls.length:site.cover.length;
   assert.ok(m.index>=0&&m.index<size);
   assert.ok(m.u>=0&&m.u<=1&&m.v>=0&&m.v<=1);
  }
 }
});
