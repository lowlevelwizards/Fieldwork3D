import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('open-plan transitions cut actual wide wall apertures deterministically',()=>{
 let observed=0;
 for(let seed=1;seed<=120;seed++){
  const s=generateSite(seed),copy=generateSite(seed);
  assert.deepEqual(s.openings??[],copy.openings??[]);
  for(const o of s.openings??[]){
   observed++;
   assert.ok(Math.hypot(o.a.x-o.b.x,o.a.y-o.b.y)>48);
   assert.ok(!s.doors.some(d=>d.id==='OPEN-'+o.id));
  }
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
 }
 assert.ok(observed>0,'no open-plan transition generated');
});
