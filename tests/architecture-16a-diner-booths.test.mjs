import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {assetLibrary,assetLibraryProblems} from '../src/worldgen/asset-library.ts';
import {generateSite} from '../src/breach-site.ts';
test('a diner booth is one physically blocking table-and-banquette installation',()=>{
 const p=propDefinition('diner-booth');assert.ok(p?.solid);
 assert.equal(p.cover,'low');
 assert.deepEqual([p.width,p.depth],[66,46]);
 assert.equal(assetLibrary().find(x=>x.id==='diner-booth')?.presentation,'bespoke');
 assert.deepEqual(assetLibraryProblems(),[]);
});
test('diner and sit-down booths are contextual and never overlap clearance regions',()=>{
 let booths=0;
 for(let seed=0;seed<144;seed++){
  const site=generateSite(seed);
  for(const o of site.cover.filter(c=>c.fixture==='diner-booth')){
   booths++;
   assert.equal(site.archetype,'restaurant');
   assert.ok(['diner','sit-down-restaurant'].includes(site.identity?.subtype));
   const room=site.rooms.find(r=>r.kind==='room'&&r.purpose==='dining'&&
     o.x-o.w/2>=r.x&&o.x+o.w/2<=r.x+r.w&&
     o.y-o.h/2>=r.y&&o.y+o.h/2<=r.y+r.h);
   assert.ok(room);
   assert.ok(site.doors.every(d=>Math.hypot(o.x-(d.a.x+d.b.x)/2,
     o.y-(d.a.y+d.b.y)/2)>=58));
  }
 }
 assert.ok(booths>0);
});
