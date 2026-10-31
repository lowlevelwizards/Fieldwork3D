import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {assessArchitecture} from '../src/worldgen/architecture-quality.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('architectural QA measures front-door purpose, zones, irregularity and motel suites',()=>{
 let locked=0;const families=new Set();
 for(let seed=1;seed<=77;seed++){
  const site=generateSite(seed,'expanded');
  if(!site.programLocked)continue;
  locked++;families.add(site.planFamily);
  const q=assessArchitecture(site);
  assert.deepEqual(q.errors,[],seed+' '+JSON.stringify(q.errors));
  assert.ok(q.zones>5);
  assert.notEqual(q.entryPurpose,'unknown');
  if(site.archetype==='motel')assert.ok(q.guestRooms>=4);
  const audit=auditGeneratedSite(seed,'expanded');
  assert.equal(audit.archetype,site.archetype);
  assert.ok(!audit.errors.some(e=>e.startsWith('inappropriate public entrance')));
 }
 assert.ok(locked>35);
 assert.ok(families.size>=8);
});
