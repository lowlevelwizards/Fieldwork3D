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
   const z=s.exteriorZones?.find(zone=>zone.id===mark.zoneId);
   assert.ok(z);
   assert.ok(mark.width>0&&mark.depth>0);
   assert.ok(mark.x-mark.width/2>=z.x-z.w/2-1);
   assert.ok(mark.y-mark.depth/2>=z.y-z.h/2-1);
  }
 }
 assert.ok(seen>0);
});
