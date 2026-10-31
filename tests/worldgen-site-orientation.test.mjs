import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assessArchitecture} from '../src/worldgen/architecture-quality.ts';
import {entryInteriorPoint} from '../src/worldgen/site-orientation.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('four playable entry orientations preserve room purpose, physical walls and tactical travel',()=>{
 const sides=new Set();
 for(let seed=1;seed<=44;seed++){
  for(const scale of ['standard','expanded']){
   const site=generateSite(seed,scale);
   assert.equal(site.programLocked,true);
   assert.deepEqual(site,generateSite(seed,scale));
   sides.add(site.entrySide);
   assert.deepEqual(assessArchitecture(site).errors,[],'seed '+seed);
   const entry=entryInteriorPoint(site);
   assert.ok(entry);
   assert.ok(site.rooms.some(r=>entry.x>r.x&&entry.x<r.x+r.w&&
     entry.y>r.y&&entry.y<r.y+r.h),'entry inside '+seed);
   activateSite(site);
   try{
    assert.ok(passable(site.entrance),'entrance blocked '+seed);
    assert.ok(passable(site.objective));
    assert.ok(route(site.spawn[0],site.objective).length,'route '+seed);
   }finally{activateSite(null);}
  }
 }
 assert.deepEqual([...sides].sort(),['east','north','south','west']);
});
