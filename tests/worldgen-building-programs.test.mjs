import test from 'node:test';
import assert from 'node:assert/strict';
import {BUILDING_ARCHETYPES} from '../src/breach-archetypes.ts';
import {programRooms} from '../src/worldgen/building-programs.ts';
import {generateSite} from '../src/breach-site.ts';
test('eleven building programs have coherent deterministic size profiles',()=>{
 assert.equal(BUILDING_ARCHETYPES.length,11);
 const observed=new Set();
 for(let seed=1;seed<=110;seed++){
  const site=generateSite(seed);observed.add(site.archetype);
  assert.ok(site.rooms.every(r=>!!r.purpose));
  assert.deepEqual(site,generateSite(seed));
 }
 assert.deepEqual([...observed].sort(),[...BUILDING_ARCHETYPES].sort());
 for(const kind of BUILDING_ARCHETYPES)for(const count of [3,5,9,14]){
  const labels=programRooms(kind,count);
  assert.equal(labels.length,count);
  assert.ok(labels.every(Boolean));
 }
});
