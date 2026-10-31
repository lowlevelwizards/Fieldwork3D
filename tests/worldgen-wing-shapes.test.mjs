import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('side and rear wings provide physically connected footprint variation',()=>{
 let side=0,rear=0;
 for(let seed=1;seed<=140;seed++){
  const site=generateSite(seed);
  assert.deepEqual(site,generateSite(seed));
  for(const room of site.rooms){
   if(room.id.startsWith('SIDE-ANNEX-'))side++;
   else if(room.id.startsWith('ANNEX-'))rear++;
  }
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
 }
 assert.ok(side>=8,'insufficient side wings');
 assert.ok(rear>=8,'insufficient rear wings');
});
