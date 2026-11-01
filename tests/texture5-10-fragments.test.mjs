import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planInteriorFragments,INTERIOR_FRAGMENT_LIMIT} from '../src/worldgen/interior-fragments.ts';
test('pristine rooms have no generated loose debris',()=>{
 for(const seed of [120,126,127,128])
  assert.deepEqual(planInteriorFragments({...generateSite(seed),conditionLevel:0}),[]);
});
test('decrepit interiors accumulate bounded and deterministic edge debris',()=>{
 let populated=0;
 for(const seed of [120,126,127,128,134,141,158]){
  const site={...generateSite(seed),conditionLevel:100};
  const fragments=planInteriorFragments(site);
  assert.deepEqual(fragments,planInteriorFragments(site));
  assert.ok(fragments.length<=INTERIOR_FRAGMENT_LIMIT);
  populated+=fragments.length;
  for(const f of fragments){
   const room=site.rooms.find(r=>r.id===f.roomId);
   assert.ok(room&&f.x>=room.x&&f.x<=room.x+room.w);
   assert.ok(room&&f.y>=room.y&&f.y<=room.y+room.h);
   assert.ok(!site.cover.some(o=>Math.abs(o.x-f.x)<o.w/2+2&&Math.abs(o.y-f.y)<o.h/2+2));
  }
 }
 assert.ok(populated>0);
});
