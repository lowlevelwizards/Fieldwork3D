import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planMicroDebris,DEBRIS_LIMIT} from '../src/worldgen/micro-debris.ts';
test('debris stays bounded and reproducible on exterior ground',()=>{
 for(let seed=1;seed<=55;seed++){
  const s=generateSite(seed),d=planMicroDebris(s);
  assert.ok(d.length<=DEBRIS_LIMIT);assert.deepEqual(d,planMicroDebris(s));
  for(const p of d)assert.ok((s.exteriorZones??[]).some(z=>
   p.x>=z.x-z.w/2&&p.x<=z.x+z.w/2&&p.y>=z.y-z.h/2&&p.y<=z.y+z.h/2));
 }
});
