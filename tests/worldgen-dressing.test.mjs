import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('property-wide condition and dressing are deterministic and do not obstruct routes',()=>{
 let seen=0;
 for(let seed=1;seed<=70;seed++){
  const site=generateSite(seed),copy=generateSite(seed);
  assert.equal(site.condition,copy.condition);
  assert.deepEqual(site.dressing,copy.dressing);
  for(const detail of site.dressing??[]){
   seen++;
   assert.ok(site.rooms.some(room=>room.id===detail.roomId));
   assert.ok(Number.isFinite(detail.elevation));
  }
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
 }
 assert.ok(seen>0);
});
