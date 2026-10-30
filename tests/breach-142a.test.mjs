import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {BUILDING_ARCHETYPES} from '../src/breach-archetypes.ts';
test('142A: archetypes assign deterministic physical rooms and fixtures',()=>{
 const found=new Set();
 for(let seed=1;seed<=42;seed++){
   const s=generateSite(seed);found.add(s.archetype);
   assert.deepEqual(s,generateSite(seed));
   assert.ok(s.rooms.every(r=>!!r.purpose));
   assert.ok(s.cover.every(o=>!!o.fixture));
 }
 assert.deepEqual([...found].sort(),[...BUILDING_ARCHETYPES].sort());
});