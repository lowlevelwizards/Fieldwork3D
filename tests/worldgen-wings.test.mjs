import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('modern footprint grammar creates deterministic stepped properties with physical entrances',()=>{
 const families=new Set();let irregular=0;
 for(let seed=1;seed<=64;seed++){
  const site=generateSite(seed),again=generateSite(seed);
  assert.deepEqual(site,again);
  assert.ok(site.programLocked);
  assert.ok(site.doors.find(d=>d.id==='FRONT'));
  families.add(site.planFamily?.replace(' / mirrored',''));
  const columns=new Set(site.rooms.map(r=>r.x));
  if(columns.size>=3&&site.rooms.length>8)irregular++;
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
 }
 assert.ok(families.size>=8);
 assert.ok(irregular>=24);
});
