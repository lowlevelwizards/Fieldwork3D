import test from 'node:test';import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planActivityWear} from '../src/worldgen/wear-sources.ts';
test('fixture wear sources are room-owned, deterministic and capped',()=>{
 for(let seed=1;seed<=60;seed++){
  const site=generateSite(seed),marks=planActivityWear(site);
  assert.deepEqual(marks,planActivityWear(site));
  assert.ok(marks.length<=14);
  for(const m of marks){
   const room=site.rooms.find(r=>r.id===m.roomId);
   assert.ok(room&&m.x>=room.x&&m.x<=room.x+room.w);
   assert.ok(room&&m.y>=room.y&&m.y<=room.y+room.h);
  }
 }
});
