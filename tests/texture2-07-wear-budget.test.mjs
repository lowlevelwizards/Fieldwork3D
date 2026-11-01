import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {planEnvironmentalWear,WEAR_BUDGET} from '../src/worldgen/environment-wear.ts';
test('wear has a bounded whole-building budget and respects room limits',()=>{
 for(let seed=1;seed<=35;seed++){
  const site=generateSite(seed);
  const marks=planEnvironmentalWear(site);
  assert.ok(marks.length<=WEAR_BUDGET[site.condition??'occupied']);
  assert.deepEqual(marks,planEnvironmentalWear(site));
  for(const m of marks){
   const room=site.rooms.find(r=>r.id===m.roomId);
   assert.ok(room&&m.x>=room.x&&m.x<=room.x+room.w);
   assert.ok(room&&m.y>=room.y&&m.y<=room.y+room.h);
  }
 }
});
