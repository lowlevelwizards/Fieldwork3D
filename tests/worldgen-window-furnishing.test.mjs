import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';

const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+3&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+3;
test('every facade window keeps a real sill and clear furnishing envelope',()=>{
 for(const seed of [1,2,3,4,5,8,13,19]){
  const site=generateSite(seed,'standard');
  const sills=site.cover.filter(o=>o.fixture==='window-sill');
  const barriers=site.cover.filter(o=>o.fixture==='glass-barrier');
  const serving=(site.openings??[]).filter(o=>o.kind==='serving');
  assert.equal(sills.length,
    (site.windows??[]).filter(w=>w.sillHeight!==0).length+serving.length,
    'raised window and service-hatch sills seed '+seed);
  for(const opening of serving){
   const x=(opening.a.x+opening.b.x)/2,y=(opening.a.y+opening.b.y)/2;
   assert.ok(sills.some(o=>Math.hypot(o.x-x,o.y-y)<1),
     'physical serving hatch sill missing '+opening.id);
  }
  assert.equal(barriers.length,(site.windows??[]).filter(w=>w.sillHeight===0).length,
    'floor-to-ceiling glass seed '+seed);
  for(const sill of sills){
   const blocker=site.cover.find(o=>o!==sill&&o.fixture!=='window-sill'&&
     o.fixture!=='window-boards'&&o.fixture!=='glass-barrier'&&overlap(sill,o));
   assert.ok(!blocker,'non-security fixture blocks window on seed '+seed+
     ': '+JSON.stringify({sill,blocker}));
  }
 }
});
test('outside cover and facade sill geometry survive the furnish pass',()=>{
 const site=generateSite(8,'small');
 assert.ok(site.cover.some(o=>o.fixture==='window-sill'));
 assert.deepEqual(site.cover,generateSite(8,'small').cover);
});
