import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';

const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+3&&
 Math.abs(a.y-b.y)<(a.h+b.h)/2+3;
test('every facade window keeps a real sill and clear furnishing envelope',()=>{
 for(const seed of [1,2,3,4,5,8,13,19]){
  const site=generateSite(seed,'standard');
  const sills=site.cover.filter(o=>o.fixture==='window-sill');
  assert.equal(sills.length,site.windows?.length??0,'seed '+seed);
  for(const sill of sills){
   assert.ok(!site.cover.some(o=>o!==sill&&o.fixture!=='window-sill'&&
     overlap(sill,o)), 'window blocked by '+seed);
  }
 }
});
test('outside cover and facade sill geometry survive the furnish pass',()=>{
 const site=generateSite(8,'small');
 assert.ok(site.cover.some(o=>o.fixture==='window-sill'));
 assert.deepEqual(site.cover,generateSite(8,'small').cover);
});
