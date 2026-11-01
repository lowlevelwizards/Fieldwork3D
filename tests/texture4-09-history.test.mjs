import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {generateSurfaceHistory,planHistoryWear,applySurfaceRepair,
 encodeSurfaceHistory,decodeSurfaceHistory} from '../src/worldgen/surface-history.ts';
test('surface history reconstructs from seed and repair events',()=>{
 for(let seed=1;seed<=30;seed++){
  const s=generateSite(seed),h=generateSurfaceHistory(s);
  assert.deepEqual(h,generateSurfaceHistory(s));
  assert.deepEqual(h,decodeSurfaceHistory(encodeSurfaceHistory(h)));
  const marks=planHistoryWear(s,h);assert.ok(marks.length<=5);
  if(!h.incidents.length)continue;
  const repaired=applySurfaceRepair(h,{incidentId:h.incidents[0].id,quality:1});
  assert.ok(planHistoryWear(s,repaired).length<=marks.length);
 }
});
