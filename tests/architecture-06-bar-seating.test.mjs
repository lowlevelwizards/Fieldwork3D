import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
test('bar furniture has distinct physical profiles and correct room eligibility',()=>{
 const bar=propDefinition('bar-counter'),seat=propDefinition('bar-stool');
 assert.ok(bar&&seat);
 assert.ok(bar.width>seat.width*3);
 assert.ok(bar.rooms.includes('dining')&&seat.rooms.includes('dining'));
});
test('diner furnishing uses a grouped bar seating installation',()=>{
 let counters=0,stools=0;
 for(let seed=1;seed<=100;seed++){
  const s=generateSite(seed);
  for(const bar of s.cover.filter(c=>c.fixture==='bar-counter')){
   counters++;
   const nearby=s.cover.filter(c=>c.fixture==='bar-stool'&&
     Math.hypot(c.x-bar.x,c.y-bar.y)<bar.w*.95);
   stools+=nearby.length;
   for(const stool of nearby)assert.ok(stool.orientation!==undefined);
  }
 }
 assert.ok(counters>0,'some restaurant programs need real bar counters');
 assert.ok(stools>0,'bar counters should be accompanied by seating');
});
