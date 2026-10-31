import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assessArchitecture} from '../src/worldgen/architecture-quality.ts';
import {activateSite,route,passable} from '../src/breach-core.ts';
test('every standard and expanded map uses realistic architecture, not legacy rooms',()=>{
 const seen=new Map();
 for(let seed=1;seed<=66;seed++){
  const standard=generateSite(seed,'standard');
  const expanded=generateSite(seed,'expanded');
  for(const site of [standard,expanded]){
   assert.ok(site.programLocked,'seed '+seed);
   assert.equal(site.seed,seed);
   assert.ok(site.planFamily);
   assert.deepEqual(assessArchitecture(site).errors,[],'seed '+seed);
   assert.ok(site.rooms.some(r=>r.kind==='room'));
   assert.ok(site.doors.some(d=>d.id==='FRONT'));
   activateSite(site);
   try{
    assert.ok(passable(site.objective));
    assert.ok(route(site.spawn[0],site.objective).length>0,'route '+seed);
   }finally{activateSite(null);}
  }
  assert.equal(standard.archetype,expanded.archetype);
  assert.ok(standard.rooms.reduce((a,r)=>a+r.w*r.h,0)<
    expanded.rooms.reduce((a,r)=>a+r.w*r.h,0));
  seen.set(standard.archetype,(seen.get(standard.archetype)??0)+1);
 }
 assert.equal(seen.size,11);
});
