import {assertPropertySurfaceSubstrate} from './property-surface-substrate.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
test('MAP 16 property finishing is deterministic, bounded and visual-only',()=>{
 let seen=0;
 for(let seed=1;seed<=40;seed++){
  const s=generateSite(seed);
  const marks=planPropertySurfaces(s);
  assert.deepEqual(marks,planPropertySurfaces(s));
  for(const mark of marks){
   seen++;
   assert.ok(mark.width>0&&mark.depth>0);
   assertPropertySurfaceSubstrate(s,mark);
  }
 }
 assert.ok(seen>0);
});
