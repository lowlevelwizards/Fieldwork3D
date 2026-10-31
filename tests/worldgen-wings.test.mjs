import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('real annex wings create connected irregular footprints without blocking missions',()=>{
 let wings=0;
 for(let seed=1;seed<=160;seed++){
  const site=generateSite(seed),again=generateSite(seed);
  assert.deepEqual(site,again);
  for(const room of site.rooms.filter(r=>r.id.startsWith('ANNEX-'))){
   wings++;
   assert.ok(site.doors.some(d=>d.id===room.id),'wing door missing');
   assert.ok(room.y>=20&&room.h>=42);
  }
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
 }
 assert.ok(wings>=10,'wing placements not appearing often enough');
});
