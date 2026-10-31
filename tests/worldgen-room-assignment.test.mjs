import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {BUILDING_ARCHETYPES} from '../src/breach-archetypes.ts';
import {programRooms} from '../src/worldgen/building-programs.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('semantic placement preserves every room-program role while preferring public frontage',()=>{
 let comparisons=0,correct=0;
 for(let seed=1;seed<=120;seed++){
  const site=generateSite(seed),rooms=site.rooms.filter(r=>r.kind==='room');
  const required=programRooms(site.archetype,rooms.length).slice().sort();
  assert.deepEqual(rooms.map(r=>r.purpose).sort(),required);
  assert.deepEqual(site,generateSite(seed));
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
  const entry=site.entrance;
  const front=rooms.find(r=>['reception','checkout','lobby','sales'].includes(r.purpose));
  const back=rooms.find(r=>['stockroom','bedroom','utility'].includes(r.purpose));
  if(front&&back){comparisons++;
   const dist=r=>Math.hypot(r.x+r.w/2-entry.x,r.y+r.h/2-entry.y);
   if(dist(front)<=dist(back))correct++;
  }
 }
 assert.equal(BUILDING_ARCHETYPES.length,11);
 assert.ok(comparisons>=8);
 assert.ok(correct/comparisons>.65,'public zones should usually be closer to access');
});
